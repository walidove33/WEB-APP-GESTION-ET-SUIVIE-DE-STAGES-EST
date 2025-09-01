// import { Component } from '@angular/core';
// import { RouterOutlet } from '@angular/router';

// @Component({
//   selector: 'app-root',
//   imports: [RouterOutlet],
//   templateUrl: './app.component.html',
//   styleUrl: './app.component.css'
// })
// export class AppComponent {
//   title = 'estbm-frontend';
// }

import { Component, OnDestroy, OnInit } from "@angular/core"
import { RouterOutlet } from "@angular/router"
import { NotificationComponent } from "../app/shared/components/notification/notification.component"
import { NotificationService } from "./services/notification.service"
import { NavbarComponent } from "./shared/components/navbar/navbar.component"
import { AuthService } from "./services/auth.service"
import { Subject, takeUntil } from "rxjs"

@Component({
  selector: "app-root",
  standalone: true,
  imports: [RouterOutlet, NotificationComponent, NavbarComponent],
  template: `
    <app-navbar></app-navbar>
    <router-outlet></router-outlet>
    <app-notification></app-notification>
  `,
  styleUrls: ["./app.component.scss"],
})
export class AppComponent implements OnInit, OnDestroy {
  title = "EST Béni Mellal - Gestion des Stages"
  private destroy$ = new Subject<void>()

  constructor(private notificationService: NotificationService, private authService: AuthService) {
    // Enable quiet mode to reduce global toast noise and improve responsiveness
    this.notificationService.setQuietMode(true)
  }

  ngOnInit(): void {
    // Set role-based theme attribute on <html> for professional palettes
    this.authService.currentUser$
      .pipe(takeUntil(this.destroy$))
      .subscribe(user => {
        const role = (user?.role || '').toUpperCase()
        const htmlEl = document.documentElement
        switch (role) {
          case 'ETUDIANT':
            htmlEl.setAttribute('data-role', 'student')
            break
          case 'ADMIN':
            htmlEl.setAttribute('data-role', 'admin')
            break
          case 'ENCADRANT':
            htmlEl.setAttribute('data-role', 'encadrant')
            break
          default:
            htmlEl.removeAttribute('data-role')
        }
      })
  }

  ngOnDestroy(): void {
    this.destroy$.next()
    this.destroy$.complete()
  }
}
