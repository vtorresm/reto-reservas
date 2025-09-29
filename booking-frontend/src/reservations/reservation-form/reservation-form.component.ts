import { Component } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { ReservationService } from '../reservation.service';
import { AlertService } from '../../app/services/alert.service';

@Component({
  selector: 'app-reservation-form',
  templateUrl: './reservation-form.component.html',
  styleUrls: ['./reservation-form.component.css']
})
export class ReservationFormComponent {
  form: FormGroup;

  constructor(
    private fb: FormBuilder,
    private service: ReservationService,
    private router: Router,
    private alertService: AlertService
  ) {
    this.form = fb.group({
      userId: [1, Validators.required], // Default user
      roomId: [1, Validators.required], // Default room
      date: ['', Validators.required],
      startTime: ['', Validators.required],
      endTime: ['', Validators.required]
    });
  }

  onSubmit() {
    if (this.form.valid) {
      this.service.create(this.form.value).subscribe({
        next: () => {
          this.alertService.showReservationSuccess().then(() => {
            this.router.navigate(['/reservations/list']);
          });
        },
        error: (err) => {
          const errorMessage = err.error?.message || 'Error desconocido';

          // Verificar el tipo de error para mostrar el mensaje apropiado
          if (errorMessage.includes('Usuario no encontrado')) {
            this.alertService.showUserNotFound();
          } else if (errorMessage.includes('Sala no encontrada')) {
            this.alertService.showRoomNotFound();
          } else if (errorMessage.includes('solapamiento de horario')) {
            this.alertService.showScheduleConflict();
          } else {
            this.alertService.showReservationError(errorMessage);
          }
        }
      });
    }
  }
}