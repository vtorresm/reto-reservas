import { Injectable } from '@angular/core';
import Swal, { SweetAlertIcon } from 'sweetalert2';

@Injectable({
  providedIn: 'root'
})
export class AlertService {

  constructor() { }

  /**
   * Muestra un mensaje de éxito
   */
  showSuccess(message: string, title: string = '¡Éxito!'): Promise<any> {
    return Swal.fire({
      icon: 'success',
      title: title,
      text: message,
      confirmButtonText: 'Aceptar',
      confirmButtonColor: '#1976d2'
    });
  }

  /**
   * Muestra un mensaje de error
   */
  showError(message: string, title: string = 'Error'): Promise<any> {
    return Swal.fire({
      icon: 'error',
      title: title,
      text: message,
      confirmButtonText: 'Aceptar',
      confirmButtonColor: '#d32f2f'
    });
  }

  /**
   * Muestra un mensaje de advertencia
   */
  showWarning(message: string, title: string = 'Advertencia'): Promise<any> {
    return Swal.fire({
      icon: 'warning',
      title: title,
      text: message,
      confirmButtonText: 'Aceptar',
      confirmButtonColor: '#ff9800'
    });
  }

  /**
   * Muestra un mensaje informativo
   */
  showInfo(message: string, title: string = 'Información'): Promise<any> {
    return Swal.fire({
      icon: 'info',
      title: title,
      text: message,
      confirmButtonText: 'Aceptar',
      confirmButtonColor: '#2196f3'
    });
  }

  /**
   * Muestra un mensaje de confirmación
   */
  showConfirm(message: string, title: string = 'Confirmar'): Promise<any> {
    return Swal.fire({
      icon: 'question',
      title: title,
      text: message,
      showCancelButton: true,
      confirmButtonText: 'Sí, confirmar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#1976d2',
      cancelButtonColor: '#757575'
    });
  }

  /**
   * Muestra un mensaje específico para cuando no existe una sala
   */
  showRoomNotFound(roomName?: string): Promise<any> {
    const message = roomName
      ? `La sala "${roomName}" no existe en el sistema.`
      : 'La sala seleccionada no existe en el sistema.';

    return this.showError(message, 'Sala no encontrada');
  }

  /**
   * Muestra un mensaje específico para cuando no existe un usuario
   */
  showUserNotFound(userName?: string): Promise<any> {
    const message = userName
      ? `El usuario "${userName}" no existe en el sistema.`
      : 'El usuario seleccionado no existe en el sistema.';

    return this.showError(message, 'Usuario no encontrado');
  }

  /**
   * Muestra un mensaje para reserva exitosa
   */
  showReservationSuccess(): Promise<any> {
    return this.showSuccess('La reserva ha sido creada exitosamente.', '¡Reserva exitosa!');
  }

  /**
   * Muestra un mensaje para error de reserva
   */
  showReservationError(errorMessage: string): Promise<any> {
    return this.showError(errorMessage, 'Error en la reserva');
  }

  /**
   * Muestra un mensaje para solapamiento de horarios
   */
  showScheduleConflict(): Promise<any> {
    return this.showWarning(
      'Ya existe una reserva para esta sala en el horario seleccionado.',
      'Conflicto de horario'
    );
  }

  /**
   * Muestra un mensaje para login exitoso
   */
  showLoginSuccess(username: string): Promise<any> {
    return this.showSuccess(
      `¡Bienvenido de vuelta, ${username}!`,
      'Inicio de sesión exitoso'
    );
  }

  /**
   * Muestra un mensaje para login fallido
   */
  showLoginError(errorMessage: string): Promise<any> {
    return this.showError(errorMessage, 'Error de inicio de sesión');
  }

  /**
   * Muestra un mensaje para registro exitoso
   */
  showRegisterSuccess(username: string): Promise<any> {
    return this.showSuccess(
      `¡Bienvenido, ${username}! Tu cuenta ha sido creada exitosamente.`,
      'Registro exitoso'
    );
  }

  /**
   * Muestra un mensaje para registro fallido
   */
  showRegisterError(errorMessage: string): Promise<any> {
    return this.showError(errorMessage, 'Error de registro');
  }
}