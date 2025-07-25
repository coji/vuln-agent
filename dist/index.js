export const createVulnAgent = () => {
    const analyze = async (targetPath) => {
        console.log(`Analyzing: ${targetPath}`);
        return { vulnerabilities: [] };
    };
    return { analyze };
};
//# sourceMappingURL=index.js.map