import { registerRootComponent } from 'expo';

import App from './App';

// registerRootComponent llama a AppRegistry.registerComponent('main', () => App);
// también se asegura de que el entorno esté bien configurado tanto en Expo Go como en una build nativa
registerRootComponent(App);
