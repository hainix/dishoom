-- CreateTable
CREATE TABLE "films" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "old_id" INTEGER,
    "title" TEXT NOT NULL,
    "year" INTEGER,
    "slug" TEXT NOT NULL,
    "rating" REAL,
    "votes" INTEGER DEFAULT 0,
    "stars" REAL,
    "summary" TEXT,
    "plot" TEXT,
    "storyline" TEXT,
    "oneliner" TEXT,
    "poster_src" TEXT,
    "trailer" TEXT,
    "writers" TEXT,
    "music_directors" TEXT,
    "wiki_handle" TEXT,
    "badges" TEXT,
    "status" TEXT DEFAULT 'library',
    "release_date" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "people" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "old_id" INTEGER,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "bio" TEXT,
    "image_url" TEXT,
    "birthdate" TEXT,
    "birthplace" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "film_people" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "film_id" INTEGER NOT NULL,
    "person_id" INTEGER NOT NULL,
    "role" TEXT NOT NULL,
    "character" TEXT,
    CONSTRAINT "film_people_film_id_fkey" FOREIGN KEY ("film_id") REFERENCES "films" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "film_people_person_id_fkey" FOREIGN KEY ("person_id") REFERENCES "people" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "reviews" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "old_id" INTEGER,
    "film_id" INTEGER NOT NULL,
    "reviewer" TEXT,
    "reviewer_id" INTEGER,
    "source_name" TEXT,
    "source_link" TEXT,
    "rating" REAL,
    "excerpt" TEXT,
    "article" TEXT,
    "img_src" TEXT,
    "date" DATETIME DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "reviews_film_id_fkey" FOREIGN KEY ("film_id") REFERENCES "films" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "articles" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "thumbnail" TEXT,
    "content" TEXT,
    "film_id" INTEGER,
    "celebrity" TEXT,
    "is_spotlight" BOOLEAN NOT NULL DEFAULT false,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "articles_film_id_fkey" FOREIGN KEY ("film_id") REFERENCES "films" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "songs" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "old_id" INTEGER,
    "film_id" INTEGER NOT NULL,
    "title" TEXT,
    "youtube_id" TEXT,
    "lyrics" TEXT,
    CONSTRAINT "songs_film_id_fkey" FOREIGN KEY ("film_id") REFERENCES "films" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "films_old_id_key" ON "films"("old_id");

-- CreateIndex
CREATE UNIQUE INDEX "films_slug_key" ON "films"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "people_old_id_key" ON "people"("old_id");

-- CreateIndex
CREATE UNIQUE INDEX "people_slug_key" ON "people"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "film_people_film_id_person_id_role_key" ON "film_people"("film_id", "person_id", "role");

-- CreateIndex
CREATE UNIQUE INDEX "reviews_old_id_key" ON "reviews"("old_id");

-- CreateIndex
CREATE UNIQUE INDEX "articles_slug_key" ON "articles"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "songs_old_id_key" ON "songs"("old_id");
