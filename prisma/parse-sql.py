#!/usr/bin/env python3
"""
Parse MySQL dump files and output JSON for Prisma seeding.
Uses a line-by-line approach that handles semicolons inside strings.
"""
import re
import json
import sys


def slugify(text, year=None):
    """Convert title + year to URL slug."""
    if not text:
        return f"film-{year}" if year else "unknown"
    slug = text.lower()
    slug = re.sub(r'[^\w\s-]', '', slug)
    slug = re.sub(r'[\s_]+', '-', slug)
    slug = re.sub(r'-+', '-', slug).strip('-')
    if year:
        return f"{slug}-{year}"
    return slug


def parse_row_values(row_str):
    """
    Parse a MySQL VALUES row like (val1, val2, 'text with ''quotes''', NULL, 123)
    Returns a list of Python values.
    Handles: NULL, integers, floats, single-quoted strings with '' escaping.
    """
    # Strip outer parens
    s = row_str.strip()
    if s.startswith('('):
        s = s[1:]
    if s.endswith('),') or s.endswith(');'):
        s = s[:-2]
    elif s.endswith(')'):
        s = s[:-1]

    result = []
    i = 0
    n = len(s)

    while i < n:
        # Skip whitespace and commas between values
        while i < n and s[i] in (' ', '\t', '\n', '\r'):
            i += 1
        if i >= n:
            break

        # Check for comma between values (after first value)
        if s[i] == ',' and result:
            i += 1
            while i < n and s[i] in (' ', '\t', '\n', '\r'):
                i += 1
            if i >= n:
                break

        if i >= n:
            break

        c = s[i]

        if s[i:i+4] == 'NULL':
            result.append(None)
            i += 4
        elif c == "'":
            # String value with '' escaping
            i += 1
            chars = []
            while i < n:
                if s[i] == "'" and i + 1 < n and s[i+1] == "'":
                    chars.append("'")
                    i += 2
                elif s[i] == "'" :
                    i += 1
                    break
                elif s[i] == '\\' and i + 1 < n:
                    next_c = s[i+1]
                    if next_c == "'":
                        chars.append("'")
                    elif next_c == '\\':
                        chars.append('\\')
                    elif next_c == 'n':
                        chars.append('\n')
                    elif next_c == 'r':
                        chars.append('\r')
                    elif next_c == 't':
                        chars.append('\t')
                    else:
                        chars.append(next_c)
                    i += 2
                else:
                    chars.append(s[i])
                    i += 1
            result.append(''.join(chars))
        elif c == '"':
            # Double-quoted string (less common)
            i += 1
            chars = []
            while i < n:
                if s[i] == '\\' and i + 1 < n:
                    chars.append(s[i+1])
                    i += 2
                elif s[i] == '"':
                    i += 1
                    break
                else:
                    chars.append(s[i])
                    i += 1
            result.append(''.join(chars))
        elif c == '-' or c.isdigit():
            j = i
            if c == '-':
                i += 1
            while i < n and (s[i].isdigit() or s[i] == '.'):
                i += 1
            num_str = s[j:i]
            try:
                result.append(float(num_str) if '.' in num_str else int(num_str))
            except ValueError:
                result.append(num_str)
        else:
            # Unknown - skip to next comma
            while i < n and s[i] != ',':
                i += 1
            result.append(None)

    return result


def extract_table_rows(lines, table_name, default_columns=None):
    """
    Extract all rows for a given table using line-by-line parsing.
    Handles both:
    - INSERT INTO `table` (`col1`, ...) VALUES (rows...)
    - INSERT INTO `table` VALUES (...) -- single row per INSERT, no column names
    """
    all_rows = []
    columns = default_columns
    in_block = False
    current_row_lines = []

    # Pattern with column names
    col_pattern = re.compile(rf"INSERT INTO `{table_name}` \(([^)]+)\) VALUES")
    # Pattern without column names (single row inline)
    no_col_pattern = re.compile(rf"INSERT INTO `{table_name}` VALUES\s*\((.+)\);?\s*$")

    for line in lines:
        stripped = line.rstrip('\n').rstrip('\r')

        m = col_pattern.search(stripped)
        if m:
            # Flush any pending row
            if current_row_lines:
                row_str = ' '.join(current_row_lines)
                vals = parse_row_values(row_str)
                if columns and len(vals) >= len(columns):
                    all_rows.append(dict(zip(columns, vals)))
                current_row_lines = []

            cols_str = m.group(1)
            columns = [c.strip().strip('`') for c in cols_str.split(',')]
            in_block = True
            continue

        # Handle INSERT ... VALUES(...) on one line (no column list)
        m2 = no_col_pattern.search(stripped)
        if m2 and columns:
            vals = parse_row_values('(' + m2.group(1) + ')')
            if len(vals) >= len(columns):
                all_rows.append(dict(zip(columns, vals)))
            continue

        if in_block:
            # Check if line starts a new statement or is a comment/empty
            if (stripped.startswith('INSERT INTO')
                    or stripped.startswith('CREATE')
                    or stripped.startswith('--')
                    or stripped.startswith('DROP')
                    or stripped.startswith('ALTER')
                    or stripped == ''):

                # Flush current row
                if current_row_lines:
                    row_str = ' '.join(current_row_lines)
                    vals = parse_row_values(row_str)
                    if columns and len(vals) >= len(columns):
                        all_rows.append(dict(zip(columns, vals)))
                    current_row_lines = []

                if not stripped.startswith(f"INSERT INTO `{table_name}`"):
                    in_block = False
                continue

            # Check if this is the start of a new row or continuation
            s = stripped.strip()
            if not s:
                continue

            # Check if starting a new row (starts with opening paren after comma)
            if s.startswith('(') and current_row_lines:
                # Flush previous row
                row_str = ' '.join(current_row_lines)
                vals = parse_row_values(row_str)
                if columns and len(vals) >= len(columns):
                    all_rows.append(dict(zip(columns, vals)))
                current_row_lines = [s]
            elif s.startswith('('):
                current_row_lines = [s]
            elif current_row_lines:
                # Continuation of multi-line row
                current_row_lines.append(s)

    # Flush last row
    if current_row_lines:
        row_str = ' '.join(current_row_lines)
        vals = parse_row_values(row_str)
        if columns and len(vals) >= len(columns):
            all_rows.append(dict(zip(columns, vals)))

    return all_rows


def parse_films(lines):
    rows = extract_table_rows(lines, 'films')
    films = []
    slug_set = set()

    for row in rows:
        title = str(row.get('title', '') or '')
        if not title:
            continue

        year = row.get('year')
        try:
            year = int(year) if year is not None else None
        except (ValueError, TypeError):
            year = None

        base_slug = slugify(title, year)
        slug = base_slug
        counter = 1
        while slug in slug_set:
            slug = f"{base_slug}-{counter}"
            counter += 1
        slug_set.add(slug)

        try:
            rating = float(row['rating']) if row.get('rating') is not None else None
        except (ValueError, TypeError):
            rating = None

        films.append({
            'oldId': row.get('id'),
            'title': title,
            'year': year,
            'slug': slug,
            'rating': rating,
            'votes': int(row.get('votes') or 0),
            'summary': (str(row.get('summary') or '')[:1000]) or None,
            'plot': (str(row.get('plot') or '')) or None,
            'storyline': (str(row.get('storyline') or '')[:2000]) or None,
            'oneliner': (str(row.get('oneliner') or '')[:500]) or None,
            'posterSrc': (str(row.get('poster_src') or '')) or None,
            'trailer': (str(row.get('trailer') or '')) or None,
            'writers': (str(row.get('writers') or '')[:500]) or None,
            'musicDirectors': (str(row.get('music_directors') or '')[:255]) or None,
            'wikiHandle': (str(row.get('wiki_handle') or '')[:255]) or None,
            'badges': (str(row.get('badges') or '')[:500]) or None,
            'status': 'library',
        })

    return films


def parse_people(lines):
    rows = extract_table_rows(lines, 'people')
    people = []
    slug_set = set()

    for row in rows:
        name = str(row.get('name') or '').strip()
        if not name:
            continue

        base_slug = slugify(name)
        slug = base_slug
        counter = 1
        while slug in slug_set:
            slug = f"{base_slug}-{counter}"
            counter += 1
        slug_set.add(slug)

        people.append({
            'oldId': row.get('id') or row.get('old_id'),
            'name': name,
            'slug': slug,
            'bio': (str(row.get('wiki_summary') or '')[:5000]) or None,
            'imageUrl': (str(row.get('poster_src') or '')) or None,
            'birthdate': (str(row.get('birthday_string') or '')[:100]) or None,
            'birthplace': (str(row.get('birthtown') or '')[:255]) or None,
        })

    return people


def parse_reviews(lines, film_old_id_to_idx):
    # reviews table: review_id, reviewer, film_id, reviewer_id, source_name,
    #                source_link, rating, date, excerpt, img_src, run, thumbs, article
    review_cols = ['review_id', 'reviewer', 'film_id', 'reviewer_id', 'source_name',
                   'source_link', 'rating', 'date', 'excerpt', 'img_src', 'run', 'thumbs', 'article']
    rows = extract_table_rows(lines, 'reviews', default_columns=review_cols)
    reviews = []

    for row in rows:
        # In dishoomreviews.sql, film_id references the film's old_id
        film_old_id = row.get('film_id')
        film_idx = film_old_id_to_idx.get(film_old_id)
        if film_idx is None:
            continue

        try:
            rating = float(row['rating']) if row.get('rating') is not None else None
        except (ValueError, TypeError):
            rating = None

        reviews.append({
            'oldId': row.get('review_id') or row.get('id'),
            'filmIdx': film_idx,  # 0-based index into films array
            'reviewer': (str(row.get('reviewer') or '')[:255]) or None,
            'sourceName': (str(row.get('source_name') or '')[:255]) or None,
            'sourceLink': (str(row.get('source_link') or '')[:255]) or None,
            'rating': rating,
            'excerpt': (str(row.get('excerpt') or '')[:1000]) or None,
            'article': (str(row.get('article') or '')) or None,
            'imgSrc': (str(row.get('img_src') or '')[:250]) or None,
        })

    return reviews


def parse_songs(lines, film_old_id_to_idx):
    rows = extract_table_rows(lines, 'songs')
    songs = []

    for row in rows:
        film_old_id = row.get('film_id')
        film_idx = film_old_id_to_idx.get(film_old_id)
        if film_idx is None:
            continue

        songs.append({
            'oldId': row.get('id'),
            'filmIdx': film_idx,
            'title': (str(row.get('name') or '')[:255]) or None,
            'youtubeId': (str(row.get('youtube_handle') or '')[:100]) or None,
        })

    return songs


def parse_articles_from_news(lines):
    """Parse news table to articles."""
    rows = extract_table_rows(lines, 'news')
    articles = []
    slug_set = set()

    for row in rows:
        title = str(row.get('title') or '').strip()
        if not title:
            continue

        base_slug = slugify(title)
        slug = base_slug
        counter = 1
        while slug in slug_set:
            slug = f"{base_slug}-{counter}"
            counter += 1
        slug_set.add(slug)

        articles.append({
            'title': title,
            'slug': slug,
            'description': (str(row.get('snippet') or '')[:500]) or None,
            'content': (str(row.get('newstext') or '')) or None,
        })

    return articles


if __name__ == '__main__':
    films_sql_path = sys.argv[1] if len(sys.argv) > 1 else '../source-files/dishoomfilms_postUniqPurge_Dec3.sql'
    reviews_sql_path = sys.argv[2] if len(sys.argv) > 2 else '../source-files/dishoomreviews.sql'
    output_path = sys.argv[3] if len(sys.argv) > 3 else './seed-data.json'

    print(f"Reading films SQL: {films_sql_path}", file=sys.stderr)
    with open(films_sql_path, 'r', errors='replace') as f:
        films_lines = f.readlines()

    print(f"Reading reviews SQL: {reviews_sql_path}", file=sys.stderr)
    with open(reviews_sql_path, 'r', errors='replace') as f:
        reviews_lines = f.readlines()

    print("Parsing films...", file=sys.stderr)
    films = parse_films(films_lines)
    print(f"  Found {len(films)} films", file=sys.stderr)

    print("Parsing people...", file=sys.stderr)
    people = parse_people(films_lines)
    print(f"  Found {len(people)} people", file=sys.stderr)

    # Build id-to-index maps: reviews reference old_id, songs reference primary id
    film_old_id_to_idx = {}   # old_id → index (for reviews)
    film_primary_id_to_idx = {}  # primary id → index (for songs in main SQL)
    for i, film in enumerate(films):
        if film.get('oldId') is not None:
            film_primary_id_to_idx[film['oldId']] = i  # oldId stores the primary key

    # Also parse old_ids from the raw film rows to build the old_id map
    raw_film_rows = extract_table_rows(films_lines, 'films')
    for i, row in enumerate(raw_film_rows):
        if i < len(films) and row.get('old_id') is not None:
            film_old_id_to_idx[row['old_id']] = i

    print("Parsing reviews...", file=sys.stderr)
    reviews = parse_reviews(reviews_lines, film_old_id_to_idx)
    print(f"  Found {len(reviews)} reviews", file=sys.stderr)

    print("Parsing songs...", file=sys.stderr)
    songs = parse_songs(films_lines, film_primary_id_to_idx)
    print(f"  Found {len(songs)} songs", file=sys.stderr)

    print("Parsing news/articles...", file=sys.stderr)
    articles = parse_articles_from_news(films_lines)
    print(f"  Found {len(articles)} articles", file=sys.stderr)

    output = {
        'films': films,
        'people': people,
        'reviews': reviews,
        'songs': songs,
        'articles': articles,
    }

    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(output, f, ensure_ascii=False, default=str)

    print(f"Output written to {output_path}", file=sys.stderr)
    print(json.dumps({
        'films': len(films),
        'people': len(people),
        'reviews': len(reviews),
        'songs': len(songs),
        'articles': len(articles),
    }))
