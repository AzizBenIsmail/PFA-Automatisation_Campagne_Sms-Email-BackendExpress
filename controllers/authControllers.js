const userModel = require("../models/userSchema");
const jwt = require("jsonwebtoken");
const sgMail = require("@sendgrid/mail");
const nodemailer = require("nodemailer");

const maxAge = 2 * 60 * 60; // 2 heures

const createToken = (id) => {
    return jwt.sign({id}, "net attijari secret", {
        expiresIn: maxAge,
    });
};

module.exports.signup_post = async (req, res) => {
    const {filename} = req.file;
    const {email, password, username} = req.body;
    try {
        const user = await userModel.create({
            username, password, email, image_user: filename,
        });
        // Envoi de l'e-mail à l'adresse e-mail de l'utilisateur
        sendWelcomeEmail(email, username);
        const token = createToken(user._id);
        res.cookie("jwt_token", token, {httpOnly: true, maxAge: maxAge * 1000});
        res.status(201).json({user});
    } catch (error) {
        res.status(500).json({message: error.message});
    }
};

module.exports.activation = async (req, res) => {
    try {
        const email = req.query.email;
        const checkIfUserExists = await userModel.findOne({email});

        if (!checkIfUserExists) {
            throw new Error("User not found!");
        }
        if (checkIfUserExists.enabled) {
            return res.redirect("http://localhost:3000/login-page/?message=Utilisateur_est_deja_active");
        }

        const currentDate = new Date();
        const updatedUser = await userModel.findByIdAndUpdate(checkIfUserExists._id, {
                $set: {
                    enabled: true, updated_at: currentDate,
                },
            }, {new: true} // Set the { new: true } option to return the updated user
        );

        return res.redirect("http://localhost:3000/login-page/?message=Utilisateur_activee_Avec_succes");
    } catch (error) {
        return res.status(500).json({message: error.message});
    }
};


module.exports.login_post = async (req, res) => {
    const {email, password} = req.body;
    try {
        const user = await userModel.login(email, password);
        const token = createToken(user._id);
        res.cookie("jwt_token", token, {httpOnly: false, maxAge: maxAge * 1000});
        req.session.user = user;
        // console.log(req.session);
        res.status(200).json({
            message: "User successfully authenticated", user: user,
        });
    } catch (error) {
        res
        .status(400)
        .json({
            erreur: error.message,
        });
    }
};

// Fonction pour envoyer un e-mail de bienvenue à l'utilisateur
function sendWelcomeEmail(email, username, id) {
    const transporter = nodemailer.createTransport({
        service: "gmail", auth: {
            user: "greencrowd2223@gmail.com", pass: "zothevkvkhobyyzw",
        },
    });
    const activationLink = `http://localhost:5000/auth/validation?email=${encodeURIComponent(email)}`;
    const mailOptions = {
        from: "greencrowd2223@gmail.com", to: email, subject: "Bienvenue sur notre site", html: `
      <html>
        <head>
          <style>
            /* Add your custom styles here */
            body {
              font-family: Arial, sans-serif;
              background-color: #f2f2f2;
              padding: 20px;
            }
            .container {
              max-width: 500px;
              margin: 0 auto;
              background-color: #ffffff;
              padding: 30px;
              border-radius: 5px;
              box-shadow: 0px 2px 5px rgba(0, 0, 0, 0.1);
            }
            h1 {
              color: #333333;
            }
            p {
              color: #555555;
            }
            h2 {
              color: #0000FF;
            }
            .button {
              display: inline-block;
              background-color: #007bff;
              color: #ffffff;
              text-decoration: none;
              padding: 10px 20px;
              border-radius: 4px;
              margin-top: 20px;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <h1>Bienvenue sur notre site</h1>
            <p>Cher</p> <h2> ${username},</h2>
            <p>Nous sommes ravis de vous accueillir parmi nous !</p>
            <p>Veuillez cliquer sur le bouton ci-dessous pour activer votre compte :</p>
            <a href="${activationLink}" ${id} class="button">Activer mon compte</a>
            <p>Cordialement,<br>L'équipe du site</p>
          </div>
        </body>
      </html>
    `,
    };

    transporter.sendMail(mailOptions, function (error, info) {
        if (error) {
            console.error("Erreur lors de l'envoi de l'e-mail de bienvenue :", error);
        } else {
            console.log("E-mail de bienvenue envoyé avec succès !");
        }
    });
}

module.exports.logout = (req, res) => {
    try {
        res.cookie("jwt_token", "", {httpOnly: false, maxAge: 1});
        req.session.destroy();
        res.status(200).json({
            message: "User successfully authenticated",
        });
    } catch (error) {
        res.status(400).json({erreur: error.message});
    }
};

module.exports.getUsers = async (req, res, next) => {
    try {
        const users = await userModel.find();
        if (!users || users.length === 0) {
            throw new Error("users not found !");
        }
        res.status(200).json({users});
    } catch (error) {
        res.status(500).json({message: error.message});
    }
};
module.exports.getUser = async (req, res, next) => {
    try {
        const id = req.session.user._id.toString();
        const user = await userModel.findById(id);
        if (!user || user.length === 0) {
            throw new Error("users not found !");
        }
        res.status(200).json({user});
    } catch (error) {
        res.status(500).json({message: error.message});
    }
};
module.exports.UserByID = async (req, res, next) => {
    try {
        const id = req.params.id;
        const user = await userModel.findById(id);
        if (!user || user.length === 0) {
            throw new Error("users not found !");
        }
        res.status(200).json({user});
    } catch (error) {
        res.status(500).json({message: error.message});
    }
};
module.exports.addUser = async (req, res, next) => {
    try {
        const {filename} = req.file;
        console.log("filename", req.file);
        const {
            username, password, email, first_Name, last_Name, phoneNumber, userType,
        } = req.body;
        console.log(req.body);
        const user = new userModel({
            username, password, email, first_Name, last_Name, phoneNumber, userType, image_user: filename,
        });

        const addeduser = await user.save();

        res.status(200).json(addeduser);
    } catch (error) {
        res.status(500).json({message: error.message});
    }
};
module.exports.updateUser = async (req, res, next) => {
    try {
        const {first_Name, last_Name, phoneNumber, password} = req.body;
        console.log(req.body);
        const id = req.user._id.toString();
        console.log(req.user._id.toString());
        const checkIfusertExists = await userModel.findById(id);
        if (!checkIfusertExists) {
            throw new Error("user not found !");
        }
        const currentDate = new Date();
        updateedUser = await userModel.findByIdAndUpdate(id, {
            $set: {
                password, first_Name, last_Name, phoneNumber, updated_at: currentDate,
            },
        }, {new: true});
        res.status(200).json(updateedUser);
    } catch (error) {
        res.status(500).json({message: error.message});
    }
};

module.exports.updateUserByID = async (req, res, next) => {
    try {
        const {first_Name, last_Name, phoneNumber, password} = req.body;
        console.log(req.body);
        const id = req.params.id;

        const checkIfusertExists = await userModel.findById(id);
        if (!checkIfusertExists) {
            throw new Error("user not found !");
        }
        const currentDate = new Date();
        updateedUser = await userModel.findByIdAndUpdate(id, {
            $set: {
                password, first_Name, last_Name, phoneNumber, updated_at: currentDate,
            },
        }, {new: true});
        res.status(200).json(updateedUser);
    } catch (error) {
        res.status(500).json({message: error.message});
    }
};

module.exports.deleteUser = async (req, res, next) => {
    try {
        const {id} = req.params;
        const user = await userModel.findById(id);

        if (!user) {
            return res.status(404).json({message: "user not found!"});
        }

        await userModel.findByIdAndDelete(user._id);

        res.status(200).json("deleted");
    } catch (error) {
        res.status(500).json({message: error.message});
    }
};

module.exports.forgotpwd = async (req, res) => {
    const {email} = req.body;
    const URL = "http://localhost:3000/resetpwd";

    try {
        res.status(200).json({message: "Welcome"});
        sgMail.setApiKey(process.env.SENDGRID_API_KEY);
        const msg = {
            to: email, from: "greencrowdproject@gmail.com", subject: "Welcome to Green Crowd Project", html: `
				<h2>Click the link to reset your password</h2>
				<p>${URL}</p>
			`, //templateId: 'd-e09cf57a0a0e45e894027ffd5b6caebb',
        };
        sgMail
        .send(msg)
        .then(() => {
            console.log("Email sent");
        })
        .catch((error) => {
            console.error(error);
        });
    } catch (error) {
        res.status(400).json({error: error.message});
    }
};

module.exports.upgrade = async (req, res) => {
    try {
        console.log("test", req.bod);

        const {id} = req.body; // Récupération de l'ID depuis le corps de la requête
        const checkIfUserExists = await userModel.findById(id);

        if (!checkIfUserExists) {
            throw new Error("User not found!");
        }

        const currentDate = new Date();
        const userType = "admin";

        const updatedUser = await userModel.findByIdAndUpdate(id, {
            $set: {
                userType: userType, enabled: true, updated_at: currentDate,
            },
        }, {new: true});

        res.status(200).json(updatedUser);
    } catch (error) {
        res.status(500).json({message: error.message});
    }
};

module.exports.downgrade = async (req, res) => {
    try {
        const {id} = req.body;
        const checkIfusertExists = await userModel.findById(id);
        if (!checkIfusertExists) {
            throw new Error("user not found !");
        }
        const currentDate = new Date();
        const user = "user";
        updateedUser = await userModel.findByIdAndUpdate(id, {
            $set: {
                userType: user, enabled: true, updated_at: currentDate,
            },
        }, {new: true});
        res.status(200).json(updateedUser);
    } catch (error) {
        res.status(500).json({message: error.message});
    }
};


module.exports.Desactive = async (req, res) => {
    try {
        const {id} = req.body;
        const checkIfusertExists = await userModel.findById(id);
        if (!checkIfusertExists) {
            throw new Error("user not found !");
        }
        const currentDate = new Date();
        updateedUser = await userModel.findByIdAndUpdate(id, {
            $set: {
                enabled: false, updated_at: currentDate,
            },
        }, {new: true});
        res.status(200).json(updateedUser);
    } catch (error) {
        res.status(500).json({message: error.message});
    }
};

module.exports.Active = async (req, res) => {
    try {
        const {id} = req.body;
        const checkIfusertExists = await userModel.findById(id);
        if (!checkIfusertExists) {
            throw new Error("user not found !");
        }
        const currentDate = new Date();
        updateedUser = await userModel.findByIdAndUpdate(id, {
            $set: {
                enabled: true, updated_at: currentDate,
            },
        }, {new: true});
        res.status(200).json(updateedUser);
    } catch (error) {
        res.status(500).json({message: error.message});
    }
};
