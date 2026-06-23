const path = require('path');

const loadWithMocks = (targetModulePath, mocks) => {
    const resolvedTarget = require.resolve(targetModulePath);
    const originalEntries = new Map();

    for (const [requestPath, mockExports] of Object.entries(mocks)) {
        const resolvedDependency = require.resolve(requestPath, {
            paths: [path.dirname(resolvedTarget)]
        });

        originalEntries.set(
            resolvedDependency,
            Object.prototype.hasOwnProperty.call(require.cache, resolvedDependency)
                ? require.cache[resolvedDependency]
                : null
        );

        require.cache[resolvedDependency] = {
            id: resolvedDependency,
            filename: resolvedDependency,
            loaded: true,
            exports: mockExports
        };
    }

    delete require.cache[resolvedTarget];
    const loadedModule = require(resolvedTarget);

    return {
        module: loadedModule,
        restore() {
            delete require.cache[resolvedTarget];
            for (const [resolvedDependency, previousEntry] of originalEntries.entries()) {
                if (previousEntry) {
                    require.cache[resolvedDependency] = previousEntry;
                } else {
                    delete require.cache[resolvedDependency];
                }
            }
        }
    };
};

module.exports = {
    loadWithMocks
};
