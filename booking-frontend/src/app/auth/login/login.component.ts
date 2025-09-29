import { Component } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../auth.service';
import { ReservationService } from '../../../reservations/reservation.service';
import { AlertService } from '../../services/alert.service';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css']
})
export class LoginComponent {
  loginForm: FormGroup;
  isLoading = false;
  errorMessage = '';

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router,
    private reservationService: ReservationService,
    private alertService: AlertService
  ) {
    this.loginForm = this.fb.group({
      username: ['', [Validators.required]],
      password: ['', [Validators.required, Validators.minLength(6)]]
    });
  }

  onSubmit(): void {
    if (this.loginForm.valid) {
      this.isLoading = true;
      this.errorMessage = '';

      this.authService.login(this.loginForm.value).subscribe({
        next: (response) => {
          this.isLoading = false;
          // El token ya se guarda automáticamente en el servicio

          // Mostrar mensaje de login exitoso con SweetAlert2
          this.alertService.showLoginSuccess(response.user.username).then(() => {
            // Redirigir al listado de reservas después de mostrar el mensaje
            this.router.navigate(['/reservations/list']);
          });
        },
        error: (error) => {
          this.isLoading = false;
          const errorMessage = error.error?.message || 'Error al iniciar sesión';

          // Mostrar mensaje de error con SweetAlert2
          this.alertService.showLoginError(errorMessage);
        }
      });
    } else {
      this.markFormGroupTouched();
    }
  }

  private markFormGroupTouched(): void {
    Object.keys(this.loginForm.controls).forEach(key => {
      const control = this.loginForm.get(key);
      control?.markAsTouched();
    });
  }

  navigateToRegister(): void {
    this.router.navigate(['/auth/register']);
  }
}
