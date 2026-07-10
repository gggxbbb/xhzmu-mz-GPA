import { createRouter, createWebHistory } from 'vue-router'
import HomeView from '../views/HomeView.vue'
import StatsView from '../views/StatsView.vue'
import ProfileView from '../views/ProfileView.vue'

const routes = [
  { path: '/', name: 'home', component: HomeView },
  { path: '/stats', name: 'stats', component: StatsView },
  { path: '/profile', name: 'profile', component: ProfileView }
]

export default createRouter({
  history: createWebHistory(),
  routes
})
