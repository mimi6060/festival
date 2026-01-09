module.exports = function (api) {
  api.cache(true);

  // WatermelonDB decorator plugin configuration
  const watermelonDBDecorators = [
    '@babel/plugin-proposal-decorators',
    { legacy: true },
  ];

  if (
    process.env.NX_TASK_TARGET_TARGET === 'build' ||
    process.env.NX_TASK_TARGET_TARGET?.includes('storybook')
  ) {
    return {
      presets: [
        [
          '@nx/react/babel',
          {
            runtime: 'automatic',
          },
        ],
      ],
      plugins: [
        watermelonDBDecorators,
        ['@babel/plugin-transform-class-properties', { loose: true }],
      ],
    };
  }

  return {
    presets: [
      ['module:@react-native/babel-preset', { useTransformReactJSX: true }],
    ],
    plugins: [
      watermelonDBDecorators,
      ['@babel/plugin-transform-class-properties', { loose: true }],
    ],
  };
};
