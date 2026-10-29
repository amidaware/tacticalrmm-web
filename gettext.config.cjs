module.exports = {
  input: {
    path: "src",
    include: ["**/*.vue", "**/*.js", "**/*.ts"],
    exclude: ["**/*.d.ts", "gettext/generated/**"],
  },
  output: {
    path: "src/gettext/locales",
    potPath: "src/gettext/locales/messages.pot",
    jsonPath: "src/gettext/generated/translations.json",
    locales: ["ru", "it"],
    flat: true,
    linguas: false,
    locations: true,
    fuzzyMatching: true,
    splitJson: false,
  },
};
