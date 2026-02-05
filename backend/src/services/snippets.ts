/**
 * Code Snippets Service
 * Provides common code snippets and templates for various programming languages
 */

interface Snippet {
  id: string;
  name: string;
  description: string;
  prefix: string; // Trigger text for autocomplete
  body: string[];
  language: string[];
}

// Common snippets organized by category
export const CODE_SNIPPETS: Snippet[] = [
  // JavaScript/TypeScript Snippets
  {
    id: 'js-console-log',
    name: 'Console Log',
    description: 'Log output to console',
    prefix: 'log',
    body: ['console.log($1);'],
    language: ['javascript', 'typescript'],
  },
  {
    id: 'js-console-error',
    name: 'Console Error',
    description: 'Log error to console',
    prefix: 'loge',
    body: ['console.error($1);'],
    language: ['javascript', 'typescript'],
  },
  {
    id: 'js-function',
    name: 'Function',
    description: 'Create a function',
    prefix: 'fn',
    body: [
      'function ${1:name}(${2:params}) {',
      '  $0',
      '}',
    ],
    language: ['javascript', 'typescript'],
  },
  {
    id: 'js-arrow-function',
    name: 'Arrow Function',
    description: 'Create an arrow function',
    prefix: 'afn',
    body: ['const ${1:name} = (${2:params}) => {', '  $0', '};'],
    language: ['javascript', 'typescript'],
  },
  {
    id: 'js-async-function',
    name: 'Async Function',
    description: 'Create an async function',
    prefix: 'asyncfn',
    body: [
      'async function ${1:name}(${2:params}) {',
      '  try {',
      '    $0',
      '  } catch (error) {',
      '    console.error(error);',
      '  }',
      '}',
    ],
    language: ['javascript', 'typescript'],
  },
  {
    id: 'js-try-catch',
    name: 'Try Catch',
    description: 'Try catch block',
    prefix: 'trycatch',
    body: [
      'try {',
      '  $1',
      '} catch (error) {',
      '  console.error(error);',
      '  $0',
      '}',
    ],
    language: ['javascript', 'typescript'],
  },
  {
    id: 'js-promise',
    name: 'Promise',
    description: 'Create a new Promise',
    prefix: 'promise',
    body: [
      'new Promise((resolve, reject) => {',
      '  $0',
      '});',
    ],
    language: ['javascript', 'typescript'],
  },
  {
    id: 'js-fetch',
    name: 'Fetch Request',
    description: 'Make a fetch request',
    prefix: 'fetch',
    body: [
      'fetch("${1:url}")',
      '  .then(response => response.json())',
      '  .then(data => {',
      '    $0',
      '  })',
      '  .catch(error => console.error(error));',
    ],
    language: ['javascript', 'typescript'],
  },
  {
    id: 'js-class',
    name: 'Class',
    description: 'Create a class',
    prefix: 'class',
    body: [
      'class ${1:ClassName} {',
      '  constructor(${2:params}) {',
      '    $0',
      '  }',
      '}',
    ],
    language: ['javascript', 'typescript'],
  },
  {
    id: 'js-import',
    name: 'Import',
    description: 'Import module',
    prefix: 'imp',
    body: ["import { $2 } from '${1:module}';"],
    language: ['javascript', 'typescript'],
  },
  {
    id: 'js-export-default',
    name: 'Export Default',
    description: 'Export default',
    prefix: 'expd',
    body: ['export default $1;'],
    language: ['javascript', 'typescript'],
  },

  // TypeScript Specific Snippets
  {
    id: 'ts-interface',
    name: 'Interface',
    description: 'Create an interface',
    prefix: 'interface',
    body: [
      'interface ${1:InterfaceName} {',
      '  ${2:property}: ${3:type};',
      '  $0',
      '}',
    ],
    language: ['typescript'],
  },
  {
    id: 'ts-type',
    name: 'Type Alias',
    description: 'Create a type alias',
    prefix: 'type',
    body: ['type ${1:TypeName} = ${2:type};'],
    language: ['typescript'],
  },
  {
    id: 'ts-enum',
    name: 'Enum',
    description: 'Create an enum',
    prefix: 'enum',
    body: [
      'enum ${1:EnumName} {',
      '  ${2:Value1},',
      '  ${3:Value2},',
      '  $0',
      '}',
    ],
    language: ['typescript'],
  },

  // Python Snippets
  {
    id: 'py-print',
    name: 'Print',
    description: 'Print to console',
    prefix: 'print',
    body: ['print($1)'],
    language: ['python'],
  },
  {
    id: 'py-function',
    name: 'Function',
    description: 'Create a function',
    prefix: 'def',
    body: [
      'def ${1:function_name}(${2:params}):',
      '    """${3:Description}"""',
      '    $0',
    ],
    language: ['python'],
  },
  {
    id: 'py-class',
    name: 'Class',
    description: 'Create a class',
    prefix: 'class',
    body: [
      'class ${1:ClassName}:',
      '    """${2:Description}"""',
      '    ',
      '    def __init__(self${3:, params}):',
      '        $0',
    ],
    language: ['python'],
  },
  {
    id: 'py-if-main',
    name: 'If Main',
    description: 'If name equals main',
    prefix: 'ifmain',
    body: [
      'if __name__ == "__main__":',
      '    $0',
    ],
    language: ['python'],
  },
  {
    id: 'py-try-except',
    name: 'Try Except',
    description: 'Try except block',
    prefix: 'tryex',
    body: [
      'try:',
      '    $1',
      'except ${2:Exception} as e:',
      '    print(f"Error: {e}")',
      '    $0',
    ],
    language: ['python'],
  },
  {
    id: 'py-with-open',
    name: 'With Open',
    description: 'Open file with context manager',
    prefix: 'withopen',
    body: [
      'with open("${1:filename}", "${2:r}") as f:',
      '    $0',
    ],
    language: ['python'],
  },
  {
    id: 'py-list-comprehension',
    name: 'List Comprehension',
    description: 'List comprehension',
    prefix: 'listcomp',
    body: ['[${1:expression} for ${2:item} in ${3:iterable}]'],
    language: ['python'],
  },
  {
    id: 'py-lambda',
    name: 'Lambda',
    description: 'Lambda function',
    prefix: 'lambda',
    body: ['lambda ${1:x}: ${2:expression}'],
    language: ['python'],
  },

  // Java Snippets
  {
    id: 'java-main',
    name: 'Main Method',
    description: 'Public static void main',
    prefix: 'main',
    body: [
      'public static void main(String[] args) {',
      '    $0',
      '}',
    ],
    language: ['java'],
  },
  {
    id: 'java-sout',
    name: 'System.out.println',
    description: 'Print to console',
    prefix: 'sout',
    body: ['System.out.println($1);'],
    language: ['java'],
  },
  {
    id: 'java-class',
    name: 'Class',
    description: 'Create a class',
    prefix: 'class',
    body: [
      'public class ${1:ClassName} {',
      '    $0',
      '}',
    ],
    language: ['java'],
  },
  {
    id: 'java-method',
    name: 'Method',
    description: 'Create a method',
    prefix: 'method',
    body: [
      'public ${1:void} ${2:methodName}(${3:params}) {',
      '    $0',
      '}',
    ],
    language: ['java'],
  },
  {
    id: 'java-for',
    name: 'For Loop',
    description: 'For loop',
    prefix: 'fori',
    body: [
      'for (int ${1:i} = 0; ${1:i} < ${2:length}; ${1:i}++) {',
      '    $0',
      '}',
    ],
    language: ['java'],
  },
  {
    id: 'java-foreach',
    name: 'Enhanced For Loop',
    description: 'Enhanced for loop',
    prefix: 'foreach',
    body: [
      'for (${1:Type} ${2:item} : ${3:collection}) {',
      '    $0',
      '}',
    ],
    language: ['java'],
  },

  // C++ Snippets
  {
    id: 'cpp-include',
    name: 'Include',
    description: 'Include header',
    prefix: 'inc',
    body: ['#include <${1:iostream}>'],
    language: ['cpp', 'c'],
  },
  {
    id: 'cpp-main',
    name: 'Main Function',
    description: 'Main function',
    prefix: 'main',
    body: [
      'int main() {',
      '    $0',
      '    return 0;',
      '}',
    ],
    language: ['cpp', 'c'],
  },
  {
    id: 'cpp-cout',
    name: 'Cout',
    description: 'Output to console',
    prefix: 'cout',
    body: ['std::cout << $1 << std::endl;'],
    language: ['cpp'],
  },
  {
    id: 'cpp-class',
    name: 'Class',
    description: 'Create a class',
    prefix: 'class',
    body: [
      'class ${1:ClassName} {',
      'public:',
      '    ${1:ClassName}();',
      '    ~${1:ClassName}();',
      '',
      'private:',
      '    $0',
      '};',
    ],
    language: ['cpp'],
  },
  {
    id: 'cpp-for',
    name: 'For Loop',
    description: 'For loop',
    prefix: 'for',
    body: [
      'for (int ${1:i} = 0; ${1:i} < ${2:n}; ${1:i}++) {',
      '    $0',
      '}',
    ],
    language: ['cpp', 'c'],
  },

  // Go Snippets
  {
    id: 'go-main',
    name: 'Main Package',
    description: 'Main package and function',
    prefix: 'main',
    body: [
      'package main',
      '',
      'import "fmt"',
      '',
      'func main() {',
      '    $0',
      '}',
    ],
    language: ['go'],
  },
  {
    id: 'go-func',
    name: 'Function',
    description: 'Create a function',
    prefix: 'func',
    body: [
      'func ${1:name}(${2:params}) ${3:returnType} {',
      '    $0',
      '}',
    ],
    language: ['go'],
  },
  {
    id: 'go-struct',
    name: 'Struct',
    description: 'Create a struct',
    prefix: 'struct',
    body: [
      'type ${1:Name} struct {',
      '    ${2:Field} ${3:type}',
      '    $0',
      '}',
    ],
    language: ['go'],
  },
  {
    id: 'go-interface',
    name: 'Interface',
    description: 'Create an interface',
    prefix: 'interface',
    body: [
      'type ${1:Name} interface {',
      '    ${2:Method}() ${3:returnType}',
      '    $0',
      '}',
    ],
    language: ['go'],
  },

  // Rust Snippets
  {
    id: 'rust-main',
    name: 'Main Function',
    description: 'Main function',
    prefix: 'main',
    body: [
      'fn main() {',
      '    $0',
      '}',
    ],
    language: ['rust'],
  },
  {
    id: 'rust-fn',
    name: 'Function',
    description: 'Create a function',
    prefix: 'fn',
    body: [
      'fn ${1:name}(${2:params}) -> ${3:ReturnType} {',
      '    $0',
      '}',
    ],
    language: ['rust'],
  },
  {
    id: 'rust-struct',
    name: 'Struct',
    description: 'Create a struct',
    prefix: 'struct',
    body: [
      'struct ${1:Name} {',
      '    ${2:field}: ${3:Type},',
      '    $0',
      '}',
    ],
    language: ['rust'],
  },
  {
    id: 'rust-impl',
    name: 'Implementation',
    description: 'Implement methods for a type',
    prefix: 'impl',
    body: [
      'impl ${1:Type} {',
      '    $0',
      '}',
    ],
    language: ['rust'],
  },

  // React Snippets
  {
    id: 'react-component',
    name: 'React Functional Component',
    description: 'Create a React functional component',
    prefix: 'rfc',
    body: [
      "import React from 'react';",
      '',
      'interface ${1:ComponentName}Props {',
      '  $2',
      '}',
      '',
      'export const ${1:ComponentName}: React.FC<${1:ComponentName}Props> = ({$3}) => {',
      '  return (',
      '    <div>',
      '      $0',
      '    </div>',
      '  );',
      '};',
    ],
    language: ['typescript', 'javascript'],
  },
  {
    id: 'react-useState',
    name: 'useState Hook',
    description: 'React useState hook',
    prefix: 'useState',
    body: ['const [${1:state}, set${1/(.*)/${1:/capitalize}/}] = useState(${2:initialValue});'],
    language: ['typescript', 'javascript'],
  },
  {
    id: 'react-useEffect',
    name: 'useEffect Hook',
    description: 'React useEffect hook',
    prefix: 'useEffect',
    body: [
      'useEffect(() => {',
      '  $0',
      '}, [${1:dependencies}]);',
    ],
    language: ['typescript', 'javascript'],
  },
];

/**
 * Get snippets for a specific language
 */
export function getSnippetsForLanguage(language: string): Snippet[] {
  const normalizedLanguage = language.toLowerCase();
  return CODE_SNIPPETS.filter(snippet => 
    snippet.language.includes(normalizedLanguage)
  );
}

/**
 * Find snippet by prefix
 */
export function findSnippetByPrefix(prefix: string, language: string): Snippet | undefined {
  const normalizedLanguage = language.toLowerCase();
  return CODE_SNIPPETS.find(snippet => 
    snippet.prefix === prefix && snippet.language.includes(normalizedLanguage)
  );
}

/**
 * Format snippet body for insertion
 */
export function formatSnippetBody(snippet: Snippet): string {
  return snippet.body.join('\n');
}

/**
 * Search snippets by query
 */
export function searchSnippets(query: string, language?: string): Snippet[] {
  const normalizedQuery = query.toLowerCase();
  
  return CODE_SNIPPETS.filter(snippet => {
    const matchesQuery = 
      snippet.name.toLowerCase().includes(normalizedQuery) ||
      snippet.description.toLowerCase().includes(normalizedQuery) ||
      snippet.prefix.toLowerCase().includes(normalizedQuery);
    
    if (language) {
      return matchesQuery && snippet.language.includes(language.toLowerCase());
    }
    
    return matchesQuery;
  });
}
