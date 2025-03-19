import express, { Application, Response, Request } from 'express';
import { PrismaClient, Prisma } from "@prisma/client";
import { TitleLanguageGenre } from "../prisma/types";
import swaggerUi from "swagger-ui-express";
import swaggerDocument from "../swagger.json"
import cors from "cors";

const port = 3000;
const app: Application = express(); // Defina explicitamente o tipo de app
const prisma = new PrismaClient();

// Configuração do CORS
app.use(cors({ origin: "http://localhost:3000" })); // Substitua pela origem correta do seu front-end

app.use(express.json());
app.use("/docs", swaggerUi.serve, swaggerUi.setup(swaggerDocument));

app.use(express.json());
app.use("/docs", swaggerUi.serve, swaggerUi.setup(swaggerDocument));

app.get("/", (req, res) => {
    res.send("Home Page");
});

app.get("/movies", async (_, res) => {
    try {
        const movies = await prisma.movie.findMany({
            orderBy: {
                id: "asc",
            },
            include: {
                genres: true,
                languages: true
            }
        });

        // Cálculo da quantidade total de filmes
        const totalMovies = movies.length;

        // Cálculo da média de duração dos filmes
        let totalDuration = 0;
        for (const movie of movies) {
            totalDuration += movie.duration
        }
        const averageDuration = totalMovies > 0 ? totalDuration / totalMovies : 0;

        res.json({
            totalMovies,
            averageDuration,
            movies,
        });

    } catch (error) {
        console.error(error);
        res.status(500).send({ message: "Houve um problema ao buscar os filmes." });
    }
});

app.get("/movies-view", async (_, res) => {
    try {
        // Usando a tag Prisma.sql para a consulta SQL
        const moviesView: TitleLanguageGenre[] = await prisma.$queryRaw<
            TitleLanguageGenre[]
        >(Prisma.sql`SELECT * FROM title_language_genre ORDER BY id ASC`);

        // Cálculo da quantidade total de filmes
        const totalMovies = moviesView.length;

        // Cálculo da média de duração dos filmes
        let totalDuration = 0;
        for (const movie of moviesView) {
            totalDuration += movie.duration
        }
        const averageDuration = totalMovies > 0 ? totalDuration / totalMovies : 0;

        res.json({
            totalMovies,
            averageDuration,
            moviesView,
        });

        // Respondendo com os dados como JSON
        res.json(moviesView);
    } catch (error) {
        console.error("Erro ao consultar a view:", error);
        res.status(500).json({ error: "Erro interno do servidor" });
    }
});

app.post("/movies", async (req, res) => {
    const { title, genre_id, language_id, oscar_count, release_date, director, duration } = req.body;

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
                release_date: new Date(release_date),
                director,
                duration
            }
        });
    } catch (error) {
        res.status(500).send({ message: "Falha ao cadastrar filme: ", error })
    }

    res.status(201).send();

});

app.put("/movies/:id", async (req, res) => {
    //pegar o id do registro que vai ser atualizado
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

        const data = { ...req.body }
        data.release_date = data.release_date ? new Date(data.release_date) : undefined;

        //pegar os dados do filme que vai ser atualizado
        await prisma.movie.update({
            where: {
                id
            },
            data: data
        });
    } catch (error) {
        res.status(500).send({ message: "Falha ao atualizar o registro do filme!", error })
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
    } catch (error) {
        res.status(500).send({ message: "Não foi possível remover o filme: ", error });
    }
    res.status(200).send({ message: "Filme deletado" });
});

app.get("/movies/:genreName", async (req, res) => {
    //receber o nome do gênero pelos parâmetros da rota
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
    } catch (error) {
        res.status(500).send({ message: "Falha ao filtrar filmes por gênero!: ", error })
    }
});

app.get("/movies-view/:genreName", async (req, res) => {
    try {
        const genreName = req.params.genreName;

        // Consulta SQL diretamente na view, com filtro pelo nome do gênero
        const moviesByGenre: TitleLanguageGenre[] = await prisma.$queryRaw<
            TitleLanguageGenre[]
        >(Prisma.sql`
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
    } catch (error) {
        console.error("Erro ao consultar a view com filtro:", error);
        res.status(500).json({ error: "Erro interno do servidor" });
    }
});

app.get("/genres", async (_, res) => {
    try {
        const genres = await prisma.genre.findMany({
            orderBy: {
                id: "asc",
            },

        });
        res.json(genres)
    } catch (error) {
        console.error(error);
        res.status(500).send({ message: "Houve um problema ao buscar os gêneros." });
    }
});

app.put("/genres/:id", async (req, res) => {
    const { id } = req.params;
    const { name } = req.body;

    if (!name) {
        res.status(400).send({ message: "O nome do gênero é obrigatório!" });
    }

    try {
        // Verificando se o gênero existe
        const genre = await prisma.genre.findUnique({
            where: { id: Number(id) },
        });

        if (!genre) {
            res.status(404).send({ message: "Gênero não encontradp!" });
        }

        const existingGenre = await prisma.genre.findFirst({
            where: {
                name: { equals: name, mode: "insensitive" },
                id: { not: Number(id) }
            },
        });

        if (existingGenre) {
            res.status(409).send({ message: "Este nome de gênero já existe." });
        }

        // Atualizando o gênero, assumindo que você tenha campos como 'name' no body da requisição
        const updatedGenre = await prisma.genre.update({
            where: { id: Number(id) },
            data: { name } // Aqui você deve passar o name do gênero
        });

        res.status(200).send({ message: "Gênero atualizado para ", genre: updatedGenre });
    } catch (error) {
        console.error(error);
        res.status(500).send({ message: "Não foi possível atualizar o gênero do filme.", error });
    }
});

app.post("/genres", async (req: Request, res: Response) => {
    const { name } = req.body;

    if (!name) {
        return res.status(400).send({ message: "O nome do gênero é obrigatório." });
    }

    try {
        // Verificar se o gênero já existe (ignorando maiúsculas e minúsculas)
        const existingGenre = await prisma.genre.findFirst({
            where: { name: { equals: name, mode: "insensitive" } }
        });

        if (existingGenre) {
            return res.status(409).send({ message: "Esse gênero já existe." });
        }

        const newGenre = await prisma.genre.create({
            data: {
                name
            }
        });

        return res.status(201).send({ message: "Novo gênero cadastrado com sucesso!", newGenre });
    } catch (error) {
        console.error(error);
        return res.status(500).send({ message: "Houve um problema ao adicionar o novo gênero." });
    }
});

app.delete("/genres/:id", async (req, res) => {
    const id = Number(req.params.id);

    try {
        const genre = await prisma.genre.findUnique({ where: { id } });

        if (!genre) {
            res.status(404).send({ message: "Gênero não encontrado!!" });
        }

        await prisma.genre.delete({
            where: {
                id
            }
        });
    } catch (error) {
        res.status(500).send({ message: "Não foi possível remover o gênero: ", error });
    }
    res.status(200).send({ message: "Gênero deletado" });
});

app.get("/movies/sort/:name", async (req, res) => {
    const sort = req.params.name;
    console.log(sort);
    let orderBy:    Prisma.MovieOrderByWithRelationInput | 
                    Prisma.MovieOrderByWithRelationInput[] | 
                    undefined;
    if (sort === "title") {
        orderBy = {
            title: "asc",
        };
    } else if (sort === "director") {
        orderBy = {
            director: "asc"
        };
    } else if (sort === "release_date") {
        orderBy = {
            release_date: "asc",
        };
    }

    try {
        const movies = await prisma.movie.findMany({
            orderBy,
            include: {
                genres: true,
                languages: true,
            },
        });

        res.json(movies);
        res.status(200).send({ message: `Listagem por ${sort} bem sucedida` })
    } catch (error) {
        console.error(error);
        res.status(500).send({ message: "Houve um problema ao buscar os filmes." });
    }
});

app.get("/movies-view/sort/:name", async (req, res) => {
    const sort = req.params.name;
    console.log(sort);

    // Definindo a ordenação de acordo com o parâmetro da URL
    let orderBy: string = 'id';  // Valor padrão de ordenação

    if (sort === "title") {
        orderBy = 'title';
    } else if (sort === "director") {
        orderBy = 'director';
    } else if (sort === "release_date") {
        orderBy = 'release_date';
    }

    try {
        // Usando queryRaw para buscar os filmes na view com a ordenação dinâmica
        const moviesView: TitleLanguageGenre[] = await prisma.$queryRaw<TitleLanguageGenre[]>(
            Prisma.sql`SELECT * FROM title_language_genre ORDER BY ${Prisma.raw(orderBy)} ASC`
        );

        // Cálculo da quantidade total de filmes
        const totalMovies = moviesView.length;

        // Cálculo da média de duração dos filmes
        let totalDuration = 0;
        for (const movie of moviesView) {
            totalDuration += movie.duration;
        }
        const averageDuration = totalMovies > 0 ? totalDuration / totalMovies : 0;

        // Respondendo com os dados como JSON
        res.status(200).json({
            totalMovies,
            averageDuration,
            moviesView,
        });

        res.status(200).send({ message: `Listagem de filmes bem sucedida` })
    } catch (error) {
        console.error("Erro ao consultar a view:", error);
        res.status(500).json({ error: "Erro interno do servidor" });
    }
});


app.listen(port, () => {
    console.log(`Servidor em execução na porta ${port}`);
})