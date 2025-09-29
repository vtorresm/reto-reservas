import { Component, OnInit } from '@angular/core';
import { ReservationService } from '../reservation.service';

@Component({
  selector: 'app-reservation-list',
  templateUrl: './reservation-list.component.html',
  styleUrls: ['./reservation-list.component.css']
})
export class ReservationListComponent implements OnInit {
  reservations: any[] = [];
  dateFilter: string = '';
  showNoReservationsMessage: boolean = false;
  isLoading: boolean = false;

  displayedColumns: string[] = ['id', 'user', 'room', 'date', 'startTime', 'endTime'];

  constructor(private service: ReservationService) { }

  ngOnInit() {
    this.loadReservations();
  }

  loadReservations() {
    this.isLoading = true;

    // Obtener siempre las reservas más actualizadas del servidor
    this.service.getAll(this.dateFilter).subscribe({
      next: (data) => {
        this.reservations = data;
        this.showNoReservationsMessage = this.reservations.length === 0;
        // Actualizar las reservas en localStorage para futuras visitas
        localStorage.setItem('current_reservations', JSON.stringify(data));
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error al obtener reservas:', error);
        // Si hay error de conexión, intentar usar reservas del localStorage como fallback
        const storedReservations = localStorage.getItem('current_reservations');
        if (storedReservations) {
          this.reservations = JSON.parse(storedReservations);
          this.showNoReservationsMessage = this.reservations.length === 0;
        } else {
          this.reservations = [];
          this.showNoReservationsMessage = true;
        }
        this.isLoading = false;
      }
    });
  }
}