import { Request, Response } from "express";
import { resolve } from "path";
import { getCustomRepository } from "typeorm";
import { AppError } from "../errors/AppError";
import { SurveysRepository } from "../repositories/SurveysRepository";
import { SurveysUsersRepository } from "../repositories/SurveysUsersRepository";
import { UserRepository } from "../repositories/UsersRepository";
import SendMailService from "../services/SendMailService";
import * as yup from "yup";


class SendMailController {

    async execute(request: Request, response: Response) {
        const { email, survey_id } = request.body;

        //Validation Shape
        const schema = yup.object().shape({
            email: yup.string().email().required(),
            survey_id: yup.string().required(),
        });
        try {
            await schema.validate(request.body, { abortEarly: false });
        } catch (err) {
            throw new AppError(err);
        }

        const usersRepository = getCustomRepository(UserRepository);
        const surveysRepository = getCustomRepository(SurveysRepository);
        const surveysUsersRepository = getCustomRepository(SurveysUsersRepository);

        const user = await usersRepository.findOne({ email });
        if (!user) {
            throw new AppError("User does not exists!");
        }

        const survey = await surveysRepository.findOne({ id: survey_id });
        if (!survey) {
            throw new AppError("Survey does not exists!");
        }


        //Path do template de e-mail
        const npsPath = resolve(__dirname, "..", "views", "emails", "npsMail.hbs");

        //Verificar se já existe um pesquisa para o usuario
        const surveyUserAlreadyExists = await surveysUsersRepository.findOne({
            // where: [{ user_id: user.id }, { value: null }], //Exemplo OR
            where: { user_id: user.id, value: null }, //AND
            relations: ["user", "survey"],
        });

        //Objeto para envio de e-mail
        const variables = {
            name: user.name,
            title: survey.title,
            description: survey.description,
            id: "",
            link: process.env.URL_MAIL
        };

        if (surveyUserAlreadyExists) {
            variables.id = surveyUserAlreadyExists.id; //Se já existir pesquisa para o usuário
            await SendMailService.execute(email, survey.title, variables, npsPath);
            return response.json(surveyUserAlreadyExists);
        }

        //Salvar as informacoes na tabela
        const surveyUser = surveysUsersRepository.create({
            user_id: user.id,
            survey_id,
        });
        await surveysUsersRepository.save(surveyUser);

        //Define o valor do id da pesquisa após a inclusão
        variables.id = surveyUser.id;

        //Enviar e-mail para o usuario
        await SendMailService.execute(email, survey.title, variables, npsPath);

        return response.json(surveyUser);
    }

}

export { SendMailController };