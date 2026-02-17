export default ({ config }) => {
  return {
    ...config,
    plugins: [
      ...(config.plugins || []),
      "expo-font",
    ],
    extra: {
      ...config.extra,
      apiUrl: process.env.EXPO_PUBLIC_API_URL,
    },
  };
};
