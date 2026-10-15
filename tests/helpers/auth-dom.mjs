// Unit DOM only: no browser automation, layout engine, network or native dialog emulation claims.
import { registerHooks } from 'node:module';
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';
import ts from 'typescript';

const root = fileURLToPath(new URL('../../', import.meta.url));
registerHooks({
  resolve(specifier, context, next) {
    if (context.parentURL?.startsWith('auth-test:')) return next(specifier, { ...context, parentURL: import.meta.url });
    if (specifier === 'next/link' || specifier === 'next/navigation' || specifier === 'next/image') return { url: `auth-test:${specifier}`, shortCircuit: true };
    if (specifier.startsWith('@/') || (specifier.startsWith('.') && context.parentURL?.includes('/src/'))) {
      const base = specifier.startsWith('@/') ? path.join(root, 'src', specifier.slice(2)) : fileURLToPath(new URL(specifier, context.parentURL));
      for (const candidate of [base, base + '.tsx', base + '.ts'])
        if (existsSync(candidate)) return { url: pathToFileURL(candidate).href, shortCircuit: true };
    }
    return next(specifier, context);
  },
  load(url, context, next) {
    if (url === 'auth-test:next/link') return { format: 'module', shortCircuit: true, source: 'import React from "react"; export default function Link({children,...props}) { return React.createElement("a",props,children); }' };
    if (url === 'auth-test:next/navigation') return { format: 'module', shortCircuit: true, source: 'export function usePathname(){ return "/"; }' };
    if (url === 'auth-test:next/image') return { format: 'module', shortCircuit: true, source: 'import React from "react"; export default function Image({unoptimized, ...props}) { return React.createElement("img",props); }' };
    if (url.endsWith('.css')) return { format: 'module', shortCircuit: true, source: 'export default new Proxy({}, {get:(_,key)=>String(key)});' };
    if (url.startsWith('file:') && /\.(tsx|ts)$/.test(url) && fileURLToPath(url).startsWith(path.join(root, 'src'))) {
      return { format: 'module', shortCircuit: true, source: ts.transpileModule(readFileSync(new URL(url), 'utf8'), { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext, jsx: ts.JsxEmit.ReactJSX } }).outputText };
    }
    return next(url, context);
  }
});
