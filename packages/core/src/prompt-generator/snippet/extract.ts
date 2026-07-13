import type { IMaterialsProtocol } from '../../material/materials-protocol';

export function extractSnippets(materials: any[]) {
  return materials
    .map((material) => material.data.materials.snippets)
    .filter((i) => i)
    .flat();
}

export function flatSnippets(snippets: any) {
  const result: any = [];

  snippets.forEach((snippets: any) => {
    if (snippets.group && snippets.children) {
      result.push(...flatSnippets(snippets.children));
    } else if (snippets.snippetName) {
      result.push(snippets);
    }
  });

  return result;
}

export function filterSnippets(snippet: any, whiteList: string[]) {
  let name = snippet?.snippetName;
  if (!name) {
    return false;
  }
  const validList = whiteList.map((name) => name.toLocaleLowerCase());
  name = name.replaceAll('-', '').toLocaleLowerCase();
  return validList.includes(name);
}

export function getSnippetsInfo(materials: IMaterialsProtocol[], whiteList: string[]) {
  return flatSnippets(extractSnippets(materials))
    .filter((snippet: any) => filterSnippets(snippet, whiteList))
    .map((item: any) => item.schema);
}
