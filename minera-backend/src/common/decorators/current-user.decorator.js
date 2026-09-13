"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CurrentUser = void 0;
var common_1 = require("@nestjs/common");
/**
 * Extrae el usuario autenticado (payload del JWT) inyectado por JwtAuthGuard.
 * Uso: async miEstado(@CurrentUser() user: JwtPayload) { ... }
 */
exports.CurrentUser = (0, common_1.createParamDecorator)(function (data, ctx) {
    var request = ctx.switchToHttp().getRequest();
    var user = request.user;
    return data ? user === null || user === void 0 ? void 0 : user[data] : user;
});
