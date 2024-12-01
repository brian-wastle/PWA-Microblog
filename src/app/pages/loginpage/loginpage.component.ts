import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { CognitoService } from '../../services/cognito/cognito.service';
import { Router } from '@angular/router';
import { PasswordModule } from 'primeng/password';
import { ButtonModule } from 'primeng/button';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';

@Component({
  selector: 'login-page',
  templateUrl: './loginpage.component.html',
  styleUrls: ['./loginpage.component.scss'],
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, ButtonModule, PasswordModule]
})
export class LoginPageComponent implements OnInit {
  authForm: FormGroup;
  loading: boolean = false;
  errorMessage: string | null = null;
  hasValidSession: boolean = false;  // Track session state manually

  constructor(
    private formBuilder: FormBuilder,
    private cognitoService: CognitoService,
    private router: Router
  ) {
    this.authForm = this.formBuilder.group({
      username: ['', Validators.required],
      password: ['', Validators.required],
    });
  }

  ngOnInit(): void {
    // Directly read the signal's current value to determine the session state
    this.updateSessionState();
  }

  // Method to update the session state by reading the signal's value directly
  private updateSessionState(): void {
    const currentUser = this.cognitoService.currentUserSignal();
    this.hasValidSession = !!currentUser && currentUser.tokenExpiration && Date.now() < Number(currentUser.tokenExpiration) * 1000;
  }

  login(): void {
    if (this.authForm.invalid) {
      return;
    }

    const { username, password } = this.authForm.value;
    this.loading = true;
    this.errorMessage = null;

    this.cognitoService
      .signIn(username, password)
      .then((session) => {
        // Redirect to dashboard or wherever you want after successful login
        this.router.navigate(['/dashboard']);
      })
      .catch((err) => {
        this.loading = false;
        this.errorMessage = err.message || 'An error occurred during login';
      });
  }
}
