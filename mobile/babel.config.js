module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    // Note: react-native-reanimated/plugin is only needed for production builds
    // Remove it for Expo Go compatibility
  };
};
