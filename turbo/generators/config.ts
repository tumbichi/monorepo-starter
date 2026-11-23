import type { PlopTypes } from '@turbo/gen';

/**
 * `pnpm gen package` → packages/<name> as an internal TypeScript package
 * (@repo/<name>) wired to the shared tsconfig and ESLint configs.
 *
 * For a new app, copy an existing one instead: `pnpm turbo gen workspace --copy`.
 */
export default function generator(plop: PlopTypes.NodePlopAPI): void {
  plop.setHelper('eq', (a: unknown, b: unknown) => a === b);

  plop.setGenerator('package', {
    description: 'Paquete interno TypeScript (@repo/<nombre>)',
    prompts: [
      {
        type: 'input',
        name: 'name',
        message: 'Nombre del paquete (sin @repo/):',
        validate: (input: string) =>
          /^[a-z][a-z0-9-]*$/.test(input) || 'Usá minúsculas, números y guiones',
      },
      {
        type: 'list',
        name: 'kind',
        message: '¿Qué tipo de paquete?',
        choices: [
          { name: 'TypeScript (Node / compartido)', value: 'base' },
          { name: 'React (componentes)', value: 'react' },
        ],
      },
    ],
    actions: [
      {
        type: 'add',
        path: 'packages/{{ name }}/package.json',
        templateFile: 'templates/package/package.json.hbs',
      },
      {
        type: 'add',
        path: 'packages/{{ name }}/tsconfig.json',
        templateFile: 'templates/package/tsconfig.json.hbs',
      },
      {
        type: 'add',
        path: 'packages/{{ name }}/eslint.config.js',
        templateFile: 'templates/package/eslint.config.js.hbs',
      },
      {
        type: 'add',
        path: 'packages/{{ name }}/src/index.ts',
        templateFile: 'templates/package/src/index.ts.hbs',
      },
      () => 'Listo. Corré `pnpm install` para enlazar el paquete nuevo.',
    ],
  });
}
