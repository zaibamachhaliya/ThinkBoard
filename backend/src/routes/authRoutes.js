import express from "express";
const authRouter = express.Router();

import { register, login, logoutUser, getCurrentUser } from "../controllers/userAuth.js";
import { authenticateUser } from "../middleware/authMiddleware.js";

authRouter.post("/register", register);
authRouter.post("/login", login);
authRouter.post("/logout", authenticateUser, logoutUser);
authRouter.get("/me", authenticateUser, getCurrentUser);

export default authRouter;