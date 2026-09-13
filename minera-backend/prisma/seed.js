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
Object.defineProperty(exports, "__esModule", { value: true });
var client_1 = require("@prisma/client");
var bcrypt = require("bcrypt");
var prisma = new client_1.PrismaClient();
function main() {
    return __awaiter(this, void 0, void 0, function () {
        var empresa, antapacay, lasBambas, tags, cargoTransportista, cargoMecanico, docDni, docAntecedentes, docMedico, docLicencia, passwordHash;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, prisma.empresa.create({
                        data: { razonSocial: 'Contratista Ejemplo S.A.C.', ruc: '20123456789' },
                    })];
                case 1:
                    empresa = _a.sent();
                    return [4 /*yield*/, prisma.minera.create({
                            data: { nombre: 'Antapacay', colorPrimario: '#0033A0', colorSecundario: '#FFC72C' },
                        })];
                case 2:
                    antapacay = _a.sent();
                    return [4 /*yield*/, prisma.minera.create({
                            data: { nombre: 'Las Bambas', colorPrimario: '#E8720C', colorSecundario: '#2B2B2B' },
                        })];
                case 3:
                    lasBambas = _a.sent();
                    return [4 /*yield*/, prisma.empresaMinera.createMany({
                            data: [
                                { empresaId: empresa.id, mineraId: antapacay.id },
                                { empresaId: empresa.id, mineraId: lasBambas.id },
                            ],
                        })];
                case 4:
                    _a.sent();
                    return [4 /*yield*/, Promise.all(['Mecánico', 'Supervisor', 'Electricista', 'Cocinero', 'Conductor', 'Transportista'].map(function (nombre) {
                            return prisma.tag.create({ data: { nombre: nombre, categoria: 'Operativo' } });
                        }))];
                case 5:
                    tags = _a.sent();
                    return [4 /*yield*/, prisma.cargo.create({
                            data: { nombre: 'Transportista', descripcion: 'Conductor de convoy minero' },
                        })];
                case 6:
                    cargoTransportista = _a.sent();
                    return [4 /*yield*/, prisma.cargo.create({ data: { nombre: 'Mecánico' } })];
                case 7:
                    cargoMecanico = _a.sent();
                    return [4 /*yield*/, prisma.documentoTipo.create({
                            data: { nombre: 'DNI', categoria: 'IDENTIDAD', requiereVencimiento: false },
                        })];
                case 8:
                    docDni = _a.sent();
                    return [4 /*yield*/, prisma.documentoTipo.create({
                            data: { nombre: 'Antecedentes Penales y Policiales', categoria: 'ANTECEDENTE', ventanaAlertaDias: 30 },
                        })];
                case 9:
                    docAntecedentes = _a.sent();
                    return [4 /*yield*/, prisma.documentoTipo.create({
                            data: { nombre: 'Examen Médico Ocupacional', categoria: 'MEDICO', ventanaAlertaDias: 30 },
                        })];
                case 10:
                    docMedico = _a.sent();
                    return [4 /*yield*/, prisma.documentoTipo.create({
                            data: { nombre: 'Licencia de Conducir Clase A-III', categoria: 'LICENCIA', ventanaAlertaDias: 45 },
                        })];
                case 11:
                    docLicencia = _a.sent();
                    // Matriz de requisitos: Antapacay exige menos cursos que Las Bambas (según el requerimiento original).
                    return [4 /*yield*/, prisma.matrizRequisito.createMany({
                            data: [
                                { mineraId: antapacay.id, cargoId: cargoTransportista.id, documentoTipoId: docDni.id, obligatorio: true, vigenteDesde: new Date() },
                                { mineraId: antapacay.id, cargoId: cargoTransportista.id, documentoTipoId: docLicencia.id, obligatorio: true, vigenteDesde: new Date() },
                                { mineraId: lasBambas.id, cargoId: cargoTransportista.id, documentoTipoId: docDni.id, obligatorio: true, vigenteDesde: new Date() },
                                { mineraId: lasBambas.id, cargoId: cargoTransportista.id, documentoTipoId: docAntecedentes.id, obligatorio: true, vigenteDesde: new Date() },
                                { mineraId: lasBambas.id, cargoId: cargoTransportista.id, documentoTipoId: docMedico.id, obligatorio: true, vigenteDesde: new Date() },
                                { mineraId: lasBambas.id, cargoId: cargoTransportista.id, documentoTipoId: docLicencia.id, obligatorio: true, vigenteDesde: new Date() },
                            ],
                        })];
                case 12:
                    // Matriz de requisitos: Antapacay exige menos cursos que Las Bambas (según el requerimiento original).
                    _a.sent();
                    return [4 /*yield*/, bcrypt.hash('CambiarEn.Produccion123!', 10)];
                case 13:
                    passwordHash = _a.sent();
                    return [4 /*yield*/, prisma.usuario.create({
                            data: { email: 'admin@empresa-ejemplo.pe', passwordHash: passwordHash, rol: 'SUPER_ADMIN' },
                        })];
                case 14:
                    _a.sent();
                    console.log('Seed completado:', { empresa: empresa.id, antapacay: antapacay.id, lasBambas: lasBambas.id, tags: tags.length, cargoMecanico: cargoMecanico.id });
                    return [2 /*return*/];
            }
        });
    });
}
main()
    .catch(function (e) {
    console.error(e);
    process.exit(1);
})
    .finally(function () { return __awaiter(void 0, void 0, void 0, function () {
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0: return [4 /*yield*/, prisma.$disconnect()];
            case 1:
                _a.sent();
                return [2 /*return*/];
        }
    });
}); });
