"use strict";
var __esDecorate = (this && this.__esDecorate) || function (ctor, descriptorIn, decorators, contextIn, initializers, extraInitializers) {
    function accept(f) { if (f !== void 0 && typeof f !== "function") throw new TypeError("Function expected"); return f; }
    var kind = contextIn.kind, key = kind === "getter" ? "get" : kind === "setter" ? "set" : "value";
    var target = !descriptorIn && ctor ? contextIn["static"] ? ctor : ctor.prototype : null;
    var descriptor = descriptorIn || (target ? Object.getOwnPropertyDescriptor(target, contextIn.name) : {});
    var _, done = false;
    for (var i = decorators.length - 1; i >= 0; i--) {
        var context = {};
        for (var p in contextIn) context[p] = p === "access" ? {} : contextIn[p];
        for (var p in contextIn.access) context.access[p] = contextIn.access[p];
        context.addInitializer = function (f) { if (done) throw new TypeError("Cannot add initializers after decoration has completed"); extraInitializers.push(accept(f || null)); };
        var result = (0, decorators[i])(kind === "accessor" ? { get: descriptor.get, set: descriptor.set } : descriptor[key], context);
        if (kind === "accessor") {
            if (result === void 0) continue;
            if (result === null || typeof result !== "object") throw new TypeError("Object expected");
            if (_ = accept(result.get)) descriptor.get = _;
            if (_ = accept(result.set)) descriptor.set = _;
            if (_ = accept(result.init)) initializers.unshift(_);
        }
        else if (_ = accept(result)) {
            if (kind === "field") initializers.unshift(_);
            else descriptor[key] = _;
        }
    }
    if (target) Object.defineProperty(target, contextIn.name, descriptor);
    done = true;
};
var __runInitializers = (this && this.__runInitializers) || function (thisArg, initializers, value) {
    var useValue = arguments.length > 2;
    for (var i = 0; i < initializers.length; i++) {
        value = useValue ? initializers[i].call(thisArg, value) : initializers[i].call(thisArg);
    }
    return useValue ? value : void 0;
};
var __setFunctionName = (this && this.__setFunctionName) || function (f, name, prefix) {
    if (typeof name === "symbol") name = name.description ? "[".concat(name.description, "]") : "";
    return Object.defineProperty(f, "name", { configurable: true, value: prefix ? "".concat(prefix, " ", name) : name });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MobileSelfAccessGuard = void 0;
var common_1 = require("@nestjs/common");
/**
 * RN-08 — Aislamiento absoluto de datos entre trabajadores.
 *
 * Este guard se aplica a TODOS los endpoints bajo /mobile/*.
 * Regla dura: cualquier trabajadorId presente en params/query/body
 * es IGNORADO Y RECHAZADO si no coincide con el trabajadorId del JWT.
 * El controller nunca debe leer un trabajadorId "de fuera" para este módulo;
 * siempre debe usar request.user.trabajadorId.
 *
 * Esta es la segunda capa de defensa (aplicación) además del RLS de Postgres
 * (ver sección 3.3.1 de la Documentación Técnica Maestra).
 */
var MobileSelfAccessGuard = function () {
    var _classDecorators = [(0, common_1.Injectable)()];
    var _classDescriptor;
    var _classExtraInitializers = [];
    var _classThis;
    var MobileSelfAccessGuard = _classThis = /** @class */ (function () {
        function MobileSelfAccessGuard_1() {
        }
        MobileSelfAccessGuard_1.prototype.canActivate = function (context) {
            var _a, _b, _c;
            var request = context.switchToHttp().getRequest();
            var user = request.user;
            if (!user || user.rol !== 'TRABAJADOR' || !user.trabajadorId) {
                throw new common_1.ForbiddenException({
                    error: {
                        code: 'ACCESO_MOBILE_NO_AUTORIZADO',
                        message: 'Este recurso solo es accesible por el rol TRABAJADOR autenticado.',
                    },
                });
            }
            var trabajadorIdSolicitado = ((_a = request.params) === null || _a === void 0 ? void 0 : _a.trabajadorId) || ((_b = request.query) === null || _b === void 0 ? void 0 : _b.trabajadorId) || ((_c = request.body) === null || _c === void 0 ? void 0 : _c.trabajadorId);
            if (trabajadorIdSolicitado && trabajadorIdSolicitado !== user.trabajadorId) {
                throw new common_1.ForbiddenException({
                    error: {
                        code: 'TRABAJADOR_ID_NO_COINCIDE',
                        message: 'No puedes consultar datos de otro trabajador.',
                    },
                });
            }
            // Fuerza el trabajadorId correcto en el request para que el controller
            // SIEMPRE lo lea de aquí, nunca de params/query/body.
            request.trabajadorIdSeguro = user.trabajadorId;
            return true;
        };
        return MobileSelfAccessGuard_1;
    }());
    __setFunctionName(_classThis, "MobileSelfAccessGuard");
    (function () {
        var _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
        __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
        MobileSelfAccessGuard = _classThis = _classDescriptor.value;
        if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        __runInitializers(_classThis, _classExtraInitializers);
    })();
    return MobileSelfAccessGuard = _classThis;
}();
exports.MobileSelfAccessGuard = MobileSelfAccessGuard;
