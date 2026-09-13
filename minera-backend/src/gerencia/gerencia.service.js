"use strict";
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
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
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
var __setFunctionName = (this && this.__setFunctionName) || function (f, name, prefix) {
    if (typeof name === "symbol") name = name.description ? "[".concat(name.description, "]") : "";
    return Object.defineProperty(f, "name", { configurable: true, value: prefix ? "".concat(prefix, " ", name) : name });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.GerenciaService = void 0;
var common_1 = require("@nestjs/common");
var GerenciaService = function () {
    var _classDecorators = [(0, common_1.Injectable)()];
    var _classDescriptor;
    var _classExtraInitializers = [];
    var _classThis;
    var GerenciaService = _classThis = /** @class */ (function () {
        function GerenciaService_1(prisma) {
            this.prisma = prisma;
        }
        /** CU-07 — KPI principal: % de personal al 100%. */
        GerenciaService_1.prototype.reportePersonal100 = function (filtros) {
            return __awaiter(this, void 0, void 0, function () {
                var contextos, total, al100, porMinera, _i, contextos_1, c, key, actual;
                var _a;
                return __generator(this, function (_b) {
                    switch (_b.label) {
                        case 0: return [4 /*yield*/, this.prisma.trabajadorEstadoContexto.findMany({
                                where: __assign(__assign({}, (filtros.mineraId && { mineraId: filtros.mineraId })), (filtros.cargoId && { cargoId: filtros.cargoId })),
                                include: { minera: true },
                            })];
                        case 1:
                            contextos = _b.sent();
                            total = contextos.length;
                            al100 = contextos.filter(function (c) { return c.es100Porciento; }).length;
                            porMinera = new Map();
                            for (_i = 0, contextos_1 = contextos; _i < contextos_1.length; _i++) {
                                c = contextos_1[_i];
                                key = c.mineraId;
                                actual = (_a = porMinera.get(key)) !== null && _a !== void 0 ? _a : { total: 0, al100: 0, nombre: c.minera.nombre };
                                actual.total += 1;
                                if (c.es100Porciento)
                                    actual.al100 += 1;
                                porMinera.set(key, actual);
                            }
                            return [2 /*return*/, {
                                    resumen: {
                                        totalTrabajadores: total,
                                        al100Porciento: al100,
                                        porcentaje100: total ? Number(((al100 / total) * 100).toFixed(1)) : 0,
                                    },
                                    distribucionPorMinera: Array.from(porMinera.values()).map(function (v) { return ({
                                        minera: v.nombre,
                                        total: v.total,
                                        al100: v.al100,
                                        porcentaje: v.total ? Number(((v.al100 / v.total) * 100).toFixed(1)) : 0,
                                    }); }),
                                }];
                    }
                });
            });
        };
        /** RN-07 — Lead time de habilitación. */
        GerenciaService_1.prototype.reporteLeadTime = function (filtros) {
            return __awaiter(this, void 0, void 0, function () {
                var contextos, dias, promedio, mediana, p90;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.prisma.trabajadorEstadoContexto.findMany({
                                where: __assign(__assign({ es100Porciento: true, fechaAlcanzo100: { not: null } }, (filtros.mineraId && { mineraId: filtros.mineraId })), (filtros.cargoId && { cargoId: filtros.cargoId })),
                                include: { trabajador: true },
                            })];
                        case 1:
                            contextos = _a.sent();
                            dias = contextos
                                .map(function (c) {
                                if (!c.fechaAlcanzo100)
                                    return null;
                                var ingreso = new Date(c.trabajador.fechaIngreso).getTime();
                                var alcanzo = new Date(c.fechaAlcanzo100).getTime();
                                return Math.round((alcanzo - ingreso) / (1000 * 60 * 60 * 24));
                            })
                                .filter(function (d) { return d !== null; })
                                .sort(function (a, b) { return a - b; });
                            promedio = dias.length ? dias.reduce(function (a, b) { return a + b; }, 0) / dias.length : 0;
                            mediana = dias.length ? dias[Math.floor(dias.length / 2)] : 0;
                            p90 = dias.length ? dias[Math.floor(dias.length * 0.9)] : 0;
                            return [2 /*return*/, {
                                    leadTimePromedioDias: Number(promedio.toFixed(1)),
                                    leadTimeMedianaDias: mediana,
                                    leadTimeP90Dias: p90,
                                    muestra: dias.length,
                                }];
                    }
                });
            });
        };
        return GerenciaService_1;
    }());
    __setFunctionName(_classThis, "GerenciaService");
    (function () {
        var _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
        __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
        GerenciaService = _classThis = _classDescriptor.value;
        if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        __runInitializers(_classThis, _classExtraInitializers);
    })();
    return GerenciaService = _classThis;
}();
exports.GerenciaService = GerenciaService;
