// @todo - share within @soundworks/helpers
/**
 * backward compatibility for old "target" vs new "runtime" client description from
 */
export function runtimeOrTarget(clientDescription) {
  return clientDescription.target || clientDescription.runtime;
}
