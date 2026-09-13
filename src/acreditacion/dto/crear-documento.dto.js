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
Object.defineProperty(exports, "__esModule", { value: true });
exports.CrearDocumentoDto = void 0;
var class_validator_1 = require("class-validator");
var CrearDocumentoDto = function () {
    var _a;
    var _trabajadorId_decorators;
    var _trabajadorId_initializers = [];
    var _trabajadorId_extraInitializers = [];
    var _documentoTipoId_decorators;
    var _documentoTipoId_initializers = [];
    var _documentoTipoId_extraInitializers = [];
    var _fechaEmision_decorators;
    var _fechaEmision_initializers = [];
    var _fechaEmision_extraInitializers = [];
    var _fechaVencimiento_decorators;
    var _fechaVencimiento_initializers = [];
    var _fechaVencimiento_extraInitializers = [];
    var _archivoBase64_decorators;
    var _archivoBase64_initializers = [];
    var _archivoBase64_extraInitializers = [];
    var _archivoMimeType_decorators;
    var _archivoMimeType_initializers = [];
    var _archivoMimeType_extraInitializers = [];
    return _a = /** @class */ (function () {
            function CrearDocumentoDto() {
                this.trabajadorId = __runInitializers(this, _trabajadorId_initializers, void 0);
                this.documentoTipoId = (__runInitializers(this, _trabajadorId_extraInitializers), __runInitializers(this, _documentoTipoId_initializers, void 0));
                this.fechaEmision = (__runInitializers(this, _documentoTipoId_extraInitializers), __runInitializers(this, _fechaEmision_initializers, void 0));
                this.fechaVencimiento = (__runInitializers(this, _fechaEmision_extraInitializers), __runInitializers(this, _fechaVencimiento_initializers, void 0));
                /**
                 * Foto/escaneo del documento en base64 (JPEG/PNG/PDF).
                 * En producción: validar tamaño máximo, mimetype real (magic bytes,
                 * no solo extensión) y escanear contra malware antes de subir a S3/GCS.
                 */
                this.archivoBase64 = (__runInitializers(this, _fechaVencimiento_extraInitializers), __runInitializers(this, _archivoBase64_initializers, void 0));
                this.archivoMimeType = (__runInitializers(this, _archivoBase64_extraInitializers), __runInitializers(this, _archivoMimeType_initializers, void 0));
                __runInitializers(this, _archivoMimeType_extraInitializers);
            }
            return CrearDocumentoDto;
        }()),
        (function () {
            var _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
            _trabajadorId_decorators = [(0, class_validator_1.IsUUID)()];
            _documentoTipoId_decorators = [(0, class_validator_1.IsUUID)()];
            _fechaEmision_decorators = [(0, class_validator_1.IsOptional)(), (0, class_validator_1.IsDateString)()];
            _fechaVencimiento_decorators = [(0, class_validator_1.IsOptional)(), (0, class_validator_1.IsDateString)()];
            _archivoBase64_decorators = [(0, class_validator_1.IsString)()];
            _archivoMimeType_decorators = [(0, class_validator_1.IsOptional)(), (0, class_validator_1.IsString)()];
            __esDecorate(null, null, _trabajadorId_decorators, { kind: "field", name: "trabajadorId", static: false, private: false, access: { has: function (obj) { return "trabajadorId" in obj; }, get: function (obj) { return obj.trabajadorId; }, set: function (obj, value) { obj.trabajadorId = value; } }, metadata: _metadata }, _trabajadorId_initializers, _trabajadorId_extraInitializers);
            __esDecorate(null, null, _documentoTipoId_decorators, { kind: "field", name: "documentoTipoId", static: false, private: false, access: { has: function (obj) { return "documentoTipoId" in obj; }, get: function (obj) { return obj.documentoTipoId; }, set: function (obj, value) { obj.documentoTipoId = value; } }, metadata: _metadata }, _documentoTipoId_initializers, _documentoTipoId_extraInitializers);
            __esDecorate(null, null, _fechaEmision_decorators, { kind: "field", name: "fechaEmision", static: false, private: false, access: { has: function (obj) { return "fechaEmision" in obj; }, get: function (obj) { return obj.fechaEmision; }, set: function (obj, value) { obj.fechaEmision = value; } }, metadata: _metadata }, _fechaEmision_initializers, _fechaEmision_extraInitializers);
            __esDecorate(null, null, _fechaVencimiento_decorators, { kind: "field", name: "fechaVencimiento", static: false, private: false, access: { has: function (obj) { return "fechaVencimiento" in obj; }, get: function (obj) { return obj.fechaVencimiento; }, set: function (obj, value) { obj.fechaVencimiento = value; } }, metadata: _metadata }, _fechaVencimiento_initializers, _fechaVencimiento_extraInitializers);
            __esDecorate(null, null, _archivoBase64_decorators, { kind: "field", name: "archivoBase64", static: false, private: false, access: { has: function (obj) { return "archivoBase64" in obj; }, get: function (obj) { return obj.archivoBase64; }, set: function (obj, value) { obj.archivoBase64 = value; } }, metadata: _metadata }, _archivoBase64_initializers, _archivoBase64_extraInitializers);
            __esDecorate(null, null, _archivoMimeType_decorators, { kind: "field", name: "archivoMimeType", static: false, private: false, access: { has: function (obj) { return "archivoMimeType" in obj; }, get: function (obj) { return obj.archivoMimeType; }, set: function (obj, value) { obj.archivoMimeType = value; } }, metadata: _metadata }, _archivoMimeType_initializers, _archivoMimeType_extraInitializers);
            if (_metadata) Object.defineProperty(_a, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        })(),
        _a;
}();
exports.CrearDocumentoDto = CrearDocumentoDto;
