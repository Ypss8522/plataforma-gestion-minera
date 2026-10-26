import { GUARDS_METADATA } from '@nestjs/common/constants';
import { RolUsuario } from '@prisma/client';
import { ROLES_KEY } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { DocumentosLecturaController } from './documentos-lectura.controller';

/**
 * Estos tests protegen la configuración, no la lógica: si alguien quita @UseGuards(RolesGuard)
 * o amplía @Roles, @Roles dejaría de aplicarse o se abriría el acceso a datos sensibles, y el CI lo detecta.
 */
describe('DocumentosLecturaController — configuración de seguridad (SCRUM-11)', () => {
  const handler = DocumentosLecturaController.prototype.obtenerUrl;

  it('declara exactamente los roles RRHH, SUPER_ADMIN y TRABAJADOR', () => {
    const roles: string[] = Reflect.getMetadata(ROLES_KEY, handler);

    expect([...roles].sort()).toEqual([RolUsuario.RRHH, RolUsuario.SUPER_ADMIN, RolUsuario.TRABAJADOR].sort());
    expect(roles).not.toContain(RolUsuario.OPERACIONES);
    expect(roles).not.toContain(RolUsuario.GERENCIA);
  });

  it('aplica RolesGuard a nivel de controlador (sin él, @Roles no se evalúa)', () => {
    const guards: unknown[] = Reflect.getMetadata(GUARDS_METADATA, DocumentosLecturaController);

    expect(guards).toContain(RolesGuard);
  });

  it('responde con Cache-Control: no-store para que la URL firmada no se guarde en cachés', () => {
    const cabeceras: Array<{ name: string; value: string }> = Reflect.getMetadata('__headers__', handler);

    expect(cabeceras).toContainEqual({ name: 'Cache-Control', value: 'no-store' });
  });

  it('expone la ruta GET :id/url bajo api/v1/documentos', () => {
    expect(Reflect.getMetadata('path', DocumentosLecturaController)).toBe('api/v1/documentos');
    expect(Reflect.getMetadata('path', handler)).toBe(':id/url');
    expect(Reflect.getMetadata('method', handler)).toBe(0); // RequestMethod.GET
  });
});
