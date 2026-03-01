// Recipe save/load/export system for discovered iterators.
// Stores recipes in localStorage and can export/import JSON files.

const STORAGE_KEY = 'ifs-recipes';

export class RecipeManager {
  constructor() {
    this._recipes = [];
    this._builtinRecipes = [];
    this._loaded = false;
  }

  async init() {
    // Load builtin recipes from recipes/index.json
    try {
      const resp = await fetch('recipes/index.json');
      if (resp.ok) {
        this._builtinRecipes = await resp.json();
      }
    } catch (_) {
      this._builtinRecipes = [];
    }

    // Load user recipes from localStorage
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) this._recipes = JSON.parse(stored);
    } catch (_) {
      this._recipes = [];
    }
    this._loaded = true;
  }

  getAll() {
    return [...this._builtinRecipes, ...this._recipes];
  }

  getUserRecipes() {
    return [...this._recipes];
  }

  save(recipe) {
    // recipe: { name, author, mode, exprX, exprY, exprZ, exprMap, a, b, c, d, ... }
    const entry = {
      id: this._generateId(),
      date: new Date().toISOString().slice(0, 10),
      ...recipe
    };
    this._recipes.push(entry);
    this._persist();
    return entry;
  }

  delete(id) {
    this._recipes = this._recipes.filter(r => r.id !== id);
    this._persist();
  }

  getById(id) {
    return this.getAll().find(r => r.id === id) || null;
  }

  // Export a recipe as a downloadable JSON file
  exportRecipe(id) {
    const recipe = this.getById(id);
    if (!recipe) return;
    const json = JSON.stringify(recipe, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${recipe.name || 'recipe'}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  // Export all user recipes as single JSON
  exportAll() {
    const json = JSON.stringify(this._recipes, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'ifs-recipes.json';
    a.click();
    URL.revokeObjectURL(url);
  }

  // Import recipes from a JSON file (array or single object)
  async importFromFile(file) {
    const text = await file.text();
    const data = JSON.parse(text);
    const recipes = Array.isArray(data) ? data : [data];
    for (const r of recipes) {
      if (!r.id) r.id = this._generateId();
      if (!r.date) r.date = new Date().toISOString().slice(0, 10);
      this._recipes.push(r);
    }
    this._persist();
    return recipes.length;
  }

  _persist() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this._recipes));
    } catch (_) { /* quota exceeded */ }
  }

  _generateId() {
    return 'recipe-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 6);
  }
}
