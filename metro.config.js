const { getDefaultConfig } = require('expo/metro-config')

const config = getDefaultConfig(__dirname)

// Guard against Metro serializer crash when a module has an undefined path.
// This can happen with certain virtual/unresolved modules in dev mode.
const existingFilter = config.serializer.processModuleFilter
config.serializer.processModuleFilter = (module) => {
  if (!module.path) return false
  return existingFilter ? existingFilter(module) : true
}

module.exports = config
