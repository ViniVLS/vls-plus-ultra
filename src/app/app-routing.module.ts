import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { HomeComponent } from './home/home.component';
import { AppLayoutComponent } from './layout/app-layout.component';
import { SettingsComponent } from './settings/settings.component';
import { RegisterComponent } from './auth/register/register.component';
import { BrowseComponent } from './browse/browse.component';
import { LibraryComponent } from './library/library.component';
import { EqualizerComponent } from './equalizer/equalizer.component';

import { ResetPasswordComponent } from './auth/reset-password/reset-password.component';
import { authGuard } from './auth.guard';

const routes: Routes = [
  { path: 'login', component: LoginComponent },
  { path: 'register', component: RegisterComponent },
  { path: 'reset-password', component: ResetPasswordComponent },
  {
    path: '',
    component: AppLayoutComponent,
    canActivate: [authGuard], // Protege todas as rotas filhas
    children: [
      { path: '', redirectTo: 'home', pathMatch: 'full' },
      { path: 'home', component: HomeComponent },
      { path: 'browse', component: BrowseComponent },
      { path: 'library', component: LibraryComponent },
      { path: 'equalizer', component: EqualizerComponent },
      { path: 'settings', component: SettingsComponent }
    ]
  },
  { path: '**', redirectTo: 'home' }
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule],
})
export class AppRoutingModule {}
