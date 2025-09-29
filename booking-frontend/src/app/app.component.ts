import { Component } from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent {
  title = 'Reserva de Salas';
  showReservationButton = false;
  showToolbar = true;

  constructor(private router: Router) {
    // Escuchar cambios de ruta para mostrar/ocultar el botón y toolbar
    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd)
    ).subscribe((event) => {
      if (event instanceof NavigationEnd) {
        this.showReservationButton = event.url === '/reservations/list';
        // Ocultar toolbar solo en el formulario de reserva
        this.showToolbar = event.url !== '/reservations/form';
      }
    });
  }

  navigateToReservationForm() {
    this.router.navigate(['/reservations/form']);
  }
}
