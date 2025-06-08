import { error } from '@sveltejs/kit';
import type { PageLoad } from './$types';

export const load: PageLoad = async ({ params, data }) => {
  const { slug } = params;
  
  try {
    // Get the server data
    const serverData = data;
    
    // Dynamically import the markdown component
    const modules = import.meta.glob('../*.md', { eager: true });
    const moduleKey = `../${slug}.md`;
    const module = modules[moduleKey];
    
    if (!module) {
      error(404, `Markdown file not found: ${slug}`);
    }
    
    // Type the module correctly
    const mod = module as { metadata?: Record<string, any>; default?: any };
    
    return {
      ...serverData,
      // The mdsvex component is available in mod.default
      component: mod.default
    };
  } catch (e) {
    // If this is already a SvelteKit error, rethrow it
    if (e && typeof e === 'object' && 'status' in e) throw e;
    
    // Otherwise, throw a generic error
    console.error(`Error loading component for toy ${slug}:`, e);
    error(500, `Failed to load component for ${slug}.`);
  }
};
