module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    // Reanimated 4 corre las animaciones en el UI thread a través de worklets.
    // Este plugin tiene que ser el último.
    plugins: ['react-native-worklets/plugin'],
  };
};
