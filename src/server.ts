import express from "express";
import { PrismaClient, Prisma } from "@prisma/client";
import { TitleLanguageGenre } from "../prisma/types";

const port = 3000;
const app = express();
const prisma = new PrismaClient();

app.get("/", (req, res) => {
    res.send("Home Page");
});

app.get("/movies", async (_, res) => {
    const movies = await prisma.movie.findMany({
        orderBy: {
            id: "asc",
        },
        include: {
            genres: true,
            languages:true
        }
    });
    res.json(movies)
});

app.get("/movies-view", async (_, res) => {
    try {
        // Usando a tag Prisma.sql para a consulta SQL
        const moviesView: TitleLanguageGenre[] = await prisma.$queryRaw<
            TitleLanguageGenre[]
        >(Prisma.sql`SELECT * FROM title_language_genre ORDER BY id ASC`);

        // Respondendo com os dados como JSON
        res.json(moviesView);
    } catch (error) {
        console.error("Erro ao consultar a view:", error);
        res.status(500).json({ error: "Erro interno do servidor" });
    }
});

app.listen(port, () => {
    console.log(`Servidor em execução na porta ${port}`);
})