import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { CognitoService } from '../../services/cognito/cognito.service';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';

@Component({
  selector: 'login-page',
  templateUrl: './loginpage.component.html',
  styleUrls: ['./loginpage.component.scss'],
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule]
})
export class LoginPageComponent implements OnInit {
  authForm: FormGroup;
  showPassword: boolean = false;
  loading: boolean = false;
  errorMessage: string | null = null;
  hasValidSession: boolean = false;

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
    this.updateSessionState();
  }

  togglePasswordVisibility(): void {
    this.showPassword = !this.showPassword;
  }

  private updateSessionState(): void {
    const currentUser = this.cognitoService.currentUserSignal();
    this.hasValidSession = currentUser && currentUser.tokenExpiration && Date.now() < Number(currentUser.tokenExpiration) * 1000;
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
        this.router.navigate(['/dashboard']);
      })
      .catch((err) => {
        this.loading = false;
        this.errorMessage = err.message || 'An error occurred during login';
      });
  }
}
