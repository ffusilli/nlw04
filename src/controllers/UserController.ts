import { Request, Response } from "express";
import { getCustomRepository } from "typeorm";
import { UserRepository } from "../repositories/UsersRepository";
import * as yup from "yup";
import { AppError } from "../errors/AppError";


class UserController {

    async create(request: Request, response: Response) {
        const { name, email } = request.body;

        //Validation Shape
        const schema = yup.object().shape({
            name: yup.string().required("campo name obrigatório"),
            email: yup.string().email("formato inválido de e-mail").required("campo email obrigatório"),
        });
        // if (!(await schema.isValid(request.body))) {
        //     return response.status(400).json({
        //         erro: "Validation Failed!"
        //     });
        // }
        try {
            await schema.validate(request.body, { abortEarly: false });
        } catch (err) {
            throw new AppError(err);
        }


        const usersRepository = getCustomRepository(UserRepository);

        //Validacao de email ja cadastrado
        const userAlreadyExists = await usersRepository.findOne({
            email
        });
        if (userAlreadyExists) {
            throw new AppError("User already exists!");
        }


        const user = usersRepository.create({
            name, email
        })

        await usersRepository.save(user);

        return response.status(201).json(user);
    }
}

export { UserController };
