import finsweetConfigs from '@finsweet/eslint-config';

export default [
    ...finsweetConfigs,
    {
        ignores: ['bin/**', 'dist/**', 'node_modules/**'],
    },
];
