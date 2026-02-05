import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService, User } from '../auth/auth.service';
import { ReservationService } from '../reservations/reservation.service';
import { RoomService } from '../services/room.service';

@Component({
  selector: 'app-dashboard',
  template: `
    <mat-toolbar color="primary">
      <span>Sistema de Reservas</span>
      <span class="spacer"></span>
      <button mat-icon-button [matMenuTriggerFor]="menu">
        <mat-icon>account_circle</mat-icon>
      </button>
      <mat-menu #menu="matMenu">
        <button mat-menu-item disabled>
          <mat-icon>person</mat-icon>
          <span>{{ currentUser?.username }}</span>
        </button>
        <button mat-menu-item (click)="logout()">
          <mat-icon>exit_to_app</mat-icon>
          <span>Cerrar Sesión</span>
        </button>
      </mat-menu>
    </mat-toolbar>

    <div class="dashboard-container">
      <mat-card class="dashboard-card">
        <mat-card-header>
          <mat-card-title>Bienvenido, {{ currentUser?.username }}</mat-card-title>
          <mat-card-subtitle>Sistema de Gestión de Reservas</mat-card-subtitle>
        </mat-card-header>
        <mat-card-content>
          <div class="stats-container">
            <div class="stat-card">
              <mat-icon>event</mat-icon>
              <h3>{{ totalReservations }}</h3>
              <p>Reservas Totales</p>
            </div>
            <div class="stat-card">
              <mat-icon>meeting_room</mat-icon>
              <h3>{{ totalRooms }}</h3>
              <p>Salas Disponibles</p>
            </div>
            <div class="stat-card">
              <mat-icon>schedule</mat-icon>
              <h3>{{ upcomingReservations }}</h3>
              <p>Próximas Reservas</p>
            </div>
          </div>
        </mat-card-content>
        <mat-card-actions>
          <button mat-raised-button color="primary" (click)="goToReservations()">
            <mat-icon>add</mat-icon>
            Nueva Reserva
          </button>
          <button mat-button (click)="goToMyReservations()">
            <mat-icon>list</mat-icon>
            Mis Reservas
          </button>
        </mat-card-actions>
      </mat-card>
    </div>
  `,
  styles: [`
    .spacer {
      flex: 1 1 auto;
    }
    .dashboard-container {
      padding: 20px;
      max-width: 1200px;
      margin: 0 auto;
    }
    .dashboard-card {
      margin-bottom: 20px;
    }
    .stats-container {
      display: flex;
      gap: 20px;
      margin-top: 20px;
      flex-wrap: wrap;
    }
    .stat-card {
      flex: 1;
      min-width: 200px;
      padding: 20px;
      text-align: center;
      background-color: #f5f5f5;
      border-radius: 8px;
    }
    .stat-card mat-icon {
      font-size: 48px;
      width: 48px;
      height: 48px;
      color: #3f51b5;
    }
    .stat-card h3 {
      margin: 10px 0;
      font-size: 32px;
      font-weight: bold;
    }
    .stat-card p {
      color: #666;
      margin: 0;
    }
  `],
})
export class DashboardComponent implements OnInit {
  currentUser: User | null = null;
  totalReservations = 0;
  totalRooms = 0;
  upcomingReservations = 0;

  constructor(
    private authService: AuthService,
    private reservationService: ReservationService,
    private roomService: RoomService,
    private router: Router,
  ) {}

  ngOnInit(): void {
    this.currentUser = this.authService.getCurrentUser();
    this.loadStats();
  }

  loadStats(): void {
    if (this.currentUser) {
      this.reservationService.getUserReservations(this.currentUser.id.toString()).subscribe({
        next: (reservations) => {
          this.totalReservations = reservations.length;
          this.upcomingReservations = reservations.filter(
            (r) => new Date(r.date) >= new Date() && r.status !== 'cancelled'
          ).length;
        },
      });

      this.roomService.getAll().subscribe({
        next: (rooms) => {
          this.totalRooms = rooms.length;
        },
      });
    }
  }

  goToReservations(): void {
    this.router.navigate(['/reservations/form']);
  }

  goToMyReservations(): void {
    this.router.navigate(['/reservations/list']);
  }

  logout(): void {
    this.authService.logout();
  }
}
