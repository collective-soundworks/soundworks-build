import vue from 'rollup-plugin-vue';

export default function(config) {
  config.plugins.unshift(vue());

  return config;
}
