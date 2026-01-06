import type { IMaterials } from '../protocols';
import type { IWhiteList } from './prompt';

export const extractSnippets = (materialsList: any[]) => {
  return materialsList
    .map((material) => material.data.materials.snippets)
    .filter((i) => i)
    .flat();
};

export const flatSnippets = (snippets: any) => {
  const result: any = [];

  snippets.forEach((snippets: any) => {
    if (snippets.group && snippets.children) {
      result.push(...flatSnippets(snippets.children));
    } else if (snippets.snippetName) {
      result.push(snippets);
    }
  });

  return result;
};

export const filterSnippets = (snippet: any, whiteList: IWhiteList) => {
  let name = snippet?.snippetName;
  if (!name) {
    return false;
  }
  const validList = whiteList.map((name) => name.toLocaleLowerCase());
  name = name.replaceAll('-', '').toLocaleLowerCase();
  return validList.includes(name);
};

export const getSnippetsInfo = (materialsList: IMaterials[], whiteList: IWhiteList) => {
  return flatSnippets(extractSnippets(materialsList))
    .filter((snippet: any) => filterSnippets(snippet, whiteList))
    .map((item: any) => item.schema);
};
