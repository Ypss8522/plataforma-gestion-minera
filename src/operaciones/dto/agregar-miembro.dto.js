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
exports.AgregarMiembroDto = void 0;
var class_validator_1 = require("class-validator");
var client_1 = require("@prisma/client");
var AgregarMiembroDto = function () {
    var _a;
    var _trabajadorId_decorators;
    var _trabajadorId_initializers = [];
    var _trabajadorId_extraInitializers = [];
    var _rolEnFrente_decorators;
    var _rolEnFrente_initializers = [];
    var _rolEnFrente_extraInitializers = [];
    var _tipoAsignacion_decorators;
    var _tipoAsignacion_initializers = [];
    var _tipoAsignacion_extraInitializers = [];
    var _forzarOverride_decorators;
    var _forzarOverride_initializers = [];
    var _forzarOverride_extraInitializers = [];
    var _overrideMotivo_decorators;
    var _overrideMotivo_initializers = [];
    var _overrideMotivo_extraInitializers = [];
    return _a = /** @class */ (function () {
            function AgregarMiembroDto() {
                this.trabajadorId = __runInitializers(this, _trabajadorId_initializers, void 0);
                this.rolEnFrente = (__runInitializers(this, _trabajadorId_extraInitializers), __runInitializers(this, _rolEnFrente_initializers, void 0));
                this.tipoAsignacion = (__runInitializers(this, _rolEnFrente_extraInitializers), __runInitializers(this, _tipoAsignacion_initializers, void 0));
                this.forzarOverride = (__runInitializers(this, _tipoAsignacion_extraInitializers), __runInitializers(this, _forzarOverride_initializers, false));
                this.overrideMotivo = (__runInitializers(this, _forzarOverride_extraInitializers), __runInitializers(this, _overrideMotivo_initializers, void 0));
                __runInitializers(this, _overrideMotivo_extraInitializers);
            }
            return AgregarMiembroDto;
        }()),
        (function () {
            var _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
            _trabajadorId_decorators = [(0, class_validator_1.IsUUID)()];
            _rolEnFrente_decorators = [(0, class_validator_1.IsEnum)(client_1.RolEnFrente)];
            _tipoAsignacion_decorators = [(0, class_validator_1.IsEnum)(client_1.TipoAsignacion)];
            _forzarOverride_decorators = [(0, class_validator_1.IsOptional)(), (0, class_validator_1.IsBoolean)()];
            _overrideMotivo_decorators = [(0, class_validator_1.ValidateIf)(function (o) { return o.forzarOverride === true; }), (0, class_validator_1.IsString)()];
            __esDecorate(null, null, _trabajadorId_decorators, { kind: "field", name: "trabajadorId", static: false, private: false, access: { has: function (obj) { return "trabajadorId" in obj; }, get: function (obj) { return obj.trabajadorId; }, set: function (obj, value) { obj.trabajadorId = value; } }, metadata: _metadata }, _trabajadorId_initializers, _trabajadorId_extraInitializers);
            __esDecorate(null, null, _rolEnFrente_decorators, { kind: "field", name: "rolEnFrente", static: false, private: false, access: { has: function (obj) { return "rolEnFrente" in obj; }, get: function (obj) { return obj.rolEnFrente; }, set: function (obj, value) { obj.rolEnFrente = value; } }, metadata: _metadata }, _rolEnFrente_initializers, _rolEnFrente_extraInitializers);
            __esDecorate(null, null, _tipoAsignacion_decorators, { kind: "field", name: "tipoAsignacion", static: false, private: false, access: { has: function (obj) { return "tipoAsignacion" in obj; }, get: function (obj) { return obj.tipoAsignacion; }, set: function (obj, value) { obj.tipoAsignacion = value; } }, metadata: _metadata }, _tipoAsignacion_initializers, _tipoAsignacion_extraInitializers);
            __esDecorate(null, null, _forzarOverride_decorators, { kind: "field", name: "forzarOverride", static: false, private: false, access: { has: function (obj) { return "forzarOverride" in obj; }, get: function (obj) { return obj.forzarOverride; }, set: function (obj, value) { obj.forzarOverride = value; } }, metadata: _metadata }, _forzarOverride_initializers, _forzarOverride_extraInitializers);
            __esDecorate(null, null, _overrideMotivo_decorators, { kind: "field", name: "overrideMotivo", static: false, private: false, access: { has: function (obj) { return "overrideMotivo" in obj; }, get: function (obj) { return obj.overrideMotivo; }, set: function (obj, value) { obj.overrideMotivo = value; } }, metadata: _metadata }, _overrideMotivo_initializers, _overrideMotivo_extraInitializers);
            if (_metadata) Object.defineProperty(_a, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        })(),
        _a;
}();
exports.AgregarMiembroDto = AgregarMiembroDto;
