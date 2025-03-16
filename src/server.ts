import express from "express";
// import { Request, Response, Application } from "express";
import { PrismaClient, Prisma } from "@prisma/client";
import { TitleLanguageGenre } from "../prisma/types";

const port = 3000;
const app = express();
const prisma = new PrismaClient();

app.use(express.json());

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
            languages: true
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

app.post("/movies", async (req, res) => {
    const { title, genre_id, language_id, oscar_count, release_date } = req.body;

        try {
        await prisma.movie.create({
            data: {
                title,
                genre_id,
                language_id,
                oscar_count,
                release_date: new Date(release_date)
            }
        });
    } catch(error) {
        return res.status(500).send({ message: "Falha ao cadastrar filme: ", error })
    }
        
    res.status(201).send();
    
});

app.put("/movies/:id", async (req, res) => {
    //pegar o id do registro que vai ser atualziado
    const id = Number(req.params.id);
    //pegar os dados do filme que vai ser atualizado
    const movie = await prisma.movie.update({
        where: {
            id
        },
        data: {
            release_date: new Date (req.body.release_date)
        }
    })
    // retornar o status correto informando que o filme foi atualizado
    res.status(200).send();
})

app.listen(port, () => {
    console.log(`Servidor em execução na porta ${port}`);
})