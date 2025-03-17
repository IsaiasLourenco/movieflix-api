"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
// import { Request, Response, Application } from "express";
const client_1 = require("@prisma/client");
const swagger_ui_express_1 = __importDefault(require("swagger-ui-express"));
const swagger_json_1 = __importDefault(require("../swagger.json"));
const cors_1 = __importDefault(require("cors"));
const port = 3000;
const app = (0, express_1.default)();
const prisma = new client_1.PrismaClient();
// Configuração do CORS
app.use((0, cors_1.default)({ origin: "http://localhost:3000" })); // Substitua pela origem correta do seu front-end
app.use(express_1.default.json());
app.use("/docs", swagger_ui_express_1.default.serve, swagger_ui_express_1.default.setup(swagger_json_1.default));
app.use(express_1.default.json());
app.use("/docs", swagger_ui_express_1.default.serve, swagger_ui_express_1.default.setup(swagger_json_1.default));
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
    res.json(movies);
});
app.get("/movies-view", async (_, res) => {
    try {
        // Usando a tag Prisma.sql para a consulta SQL
        const moviesView = await prisma.$queryRaw(client_1.Prisma.sql `SELECT * FROM title_language_genre ORDER BY id ASC`);
        // Respondendo com os dados como JSON
        res.json(moviesView);
    }
    catch (error) {
        console.error("Erro ao consultar a view:", error);
        res.status(500).json({ error: "Erro interno do servidor" });
    }
});
app.post("/movies", async (req, res) => {
    const { title, genre_id, language_id, oscar_count, release_date } = req.body;
    try {
        //Verificar no banco se já existe um filme com o nome que já está sendo enviado
        // case insensitive - não faz match se tiver maiúsculas ou minúsculas
        // case senssitive - o contrário de case insensitive
        const movieWithSameTitle = await prisma.movie.findFirst({
            where: { title: { equals: title, mode: "insensitive" } },
        });
        if (movieWithSameTitle) {
            res.status(409).send({ message: "Já existe um filme cadastrado com esse título" });
        }
        await prisma.movie.create({
            data: {
                title,
                genre_id,
                language_id,
                oscar_count,
                release_date: new Date(release_date)
            }
        });
    }
    catch (error) {
        res.status(500).send({ message: "Falha ao cadastrar filme: ", error });
    }
    res.status(201).send();
});
app.put("/movies/:id", async (req, res) => {
    //pegar o id do registro que vai ser atualziado
    const id = Number(req.params.id);
    try {
        const movie = await prisma.movie.findUnique({
            where: {
                id
            }
        });
        if (!movie) {
            res.status(404).send({ message: "Filme não encontrado!" });
        }
        const data = { ...req.body };
        data.release_date = data.release_date ? new Date(data.release_date) : undefined;
        //pegar os dados do filme que vai ser atualizado
        await prisma.movie.update({
            where: {
                id
            },
            data: data
        });
    }
    catch (error) {
        res.status(500).send({ message: "Falha ao atualizar o registro do filme!", error });
    }
    // retornar o status correto informando que o filme foi atualizado
    res.status(200).send();
});
app.delete("/movies/:id", async (req, res) => {
    const id = Number(req.params.id);
    try {
        const movie = await prisma.movie.findUnique({ where: { id } });
        if (!movie) {
            res.status(404).send({ message: "Filme não encontrado!!" });
        }
        await prisma.movie.delete({
            where: {
                id
            }
        });
    }
    catch (error) {
        res.status(500).send({ message: "Não foi possível remover o filme: ", error });
    }
    res.status(200).send({ message: "Filme deletado" });
});
app.get("/movies/:genreName", async (req, res) => {
    //receber o ome do gênero pelos parâmetros da rota
    try {
        //filtrar os filmes do banco pelo gênero
        const moviesFilteredByGenreName = await prisma.movie.findMany({
            include: {
                genres: true,
                languages: true
            },
            where: {
                genres: {
                    name: {
                        equals: req.params.genreName,
                        mode: "insensitive"
                    }
                }
            }
        });
        if (moviesFilteredByGenreName.length === 0) {
            res.status(404).send({ message: "Gênero não encontrado!!" });
            return;
        }
        //retornar os filmes filtrados na resposta da rota
        res.status(200).send(moviesFilteredByGenreName);
    }
    catch (error) {
        res.status(500).send({ message: "Falha ao filtrar filmes por gênero!: ", error });
    }
});
app.get("/movies-view/:genreName", async (req, res) => {
    try {
        const genreName = req.params.genreName;
        // Consulta SQL diretamente na view, com filtro pelo nome do gênero
        const moviesByGenre = await prisma.$queryRaw(client_1.Prisma.sql `
            SELECT * 
            FROM title_language_genre
            WHERE genre_name ILIKE ${genreName} 
            ORDER BY id ASC
        `);
        // Validar se encontrou filmes
        if (moviesByGenre.length === 0) {
            res.status(404).send({ message: "Gênero não encontrado!!" });
            return;
        }
        // Retornar os filmes filtrados
        res.json(moviesByGenre);
    }
    catch (error) {
        console.error("Erro ao consultar a view com filtro:", error);
        res.status(500).json({ error: "Erro interno do servidor" });
    }
});
app.listen(port, () => {
    console.log(`Servidor em execução na porta ${port}`);
});
