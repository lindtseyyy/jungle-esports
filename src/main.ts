import { mount } from 'svelte';
import '@fontsource/lilita-one/latin-400.css';
import '@fontsource/nunito/latin-400.css';
import '@fontsource/nunito/latin-600.css';
import '@fontsource/nunito/latin-800.css';
import '@fontsource/nunito/latin-900.css';
import './style.css';
import App from './ui/App.svelte';
if (import.meta.env.DEV && new URL(window.location.href).searchParams.get('lab') === 'animals') {
  void import('./render3d/lab/Lab.svelte').then(({ default: Lab }) =>
    mount(Lab, { target: document.getElementById('app')! }),
  );
} else {
  mount(App, { target: document.getElementById('app')! });
}
