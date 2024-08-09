"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const user_1 = __importDefault(require("./user"));
const product_1 = __importDefault(require("./product"));
const admin_1 = __importDefault(require("./admin"));
const s3_1 = require("../utils/s3");
const mainRouter = express_1.default.Router();
mainRouter.use("/user", user_1.default);
mainRouter.use("/product", product_1.default);
mainRouter.use("/admin", admin_1.default);
mainRouter.post('/', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const url = yield (0, s3_1.getObjectURL)("reviewImage/b4e80c15-fe67-49ef-bd80-0c557cb1ee55/review1722621934819.jpg");
    return res.status(200).json({
        url: url,
    });
}));
exports.default = mainRouter;
