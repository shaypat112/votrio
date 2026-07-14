#!/usr/bin/env node
interface VotrioConfig {
    model?: string;
    traces?: {
        enabled?: boolean;
        minConfidence?: number;
        showFix?: boolean;
    };
    scan?: {
        ignore?: string[];
        autoFix?: boolean;
        ai?: boolean;
        aiModel?: string;
        publish?: boolean;
        rules?: string;
    };
    slop?: {
        enabled?: boolean;
        checkImports?: boolean;
    };
}
declare function defineConfig(config: VotrioConfig): VotrioConfig;

export { defineConfig };
