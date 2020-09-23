/* eslint-disable @typescript-eslint/no-object-literal-type-assertion */
import * as ts from "typescript";
import {
  Block,
  createBlock,
  createCallExpression,
  createExpressionStatement,
  createFunctionExpression,
  createIdentifier,
  createStringLiteral,
  Plugin
} from "typescript-to-lua";

export const RequirePreload: Plugin = {
  visitors: {
    [ts.SyntaxKind.SourceFile]: (node, context) => {
      const [fileContent] = context.superTransformNode(node) as Block[];
      if (context.isModule) {
        const moduleFunction = createFunctionExpression(
          fileContent,
          undefined,
          undefined,
          undefined
        );

        let moduleName = context.sourceFile.fileName.split("src")[1];
        if (moduleName.startsWith("/")) moduleName = moduleName.substring(1);
        if (moduleName.endsWith(".tsx")) moduleName = moduleName.substring(0, moduleName.length - 4);
        if (moduleName.endsWith(".ts")) moduleName = moduleName.substring(0, moduleName.length - 3);
        moduleName = moduleName.split("/").join(".");
        moduleName = moduleName.replace(".index", "");
        // Skip init.lua so it can be the entry-point
        if (moduleName === "init") return fileContent;

        // Generates:
        // tstl_register_module("module/name", function() ... end)
        const moduleCallExpression = createCallExpression(
          createIdentifier("tstl_register_module"),
          [createStringLiteral(moduleName), moduleFunction]
        );

        return createBlock([createExpressionStatement(moduleCallExpression)]);
      }
      return fileContent;
    },
  },
};
