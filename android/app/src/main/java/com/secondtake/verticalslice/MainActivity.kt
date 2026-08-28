package com.secondtake.verticalslice

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.lifecycle.viewmodel.compose.viewModel
import androidx.lifecycle.viewmodel.initializer
import androidx.lifecycle.viewmodel.viewModelFactory
import androidx.lifecycle.viewmodel.CreationExtras
import androidx.lifecycle.createSavedStateHandle
import com.secondtake.verticalslice.ui.ConnectedConversationViewModel
import com.secondtake.verticalslice.ui.ConnectedSecondTakeApp
import com.secondtake.verticalslice.billing.EntitlementViewModel
import com.secondtake.verticalslice.ui.theme.SecondTakeTheme

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        setContent {
            SecondTakeTheme {
                val viewModel: ConnectedConversationViewModel = viewModel(factory = viewModelFactory {
                    initializer { ConnectedConversationViewModel(createSavedStateHandle(), SecondTakeAppGraph.repository()) }
                })
                val entitlementViewModel: EntitlementViewModel = viewModel(factory = viewModelFactory {
                    initializer { EntitlementViewModel(SecondTakeAppGraph.entitlementRepository()) }
                })
                ConnectedSecondTakeApp(viewModel, entitlementViewModel, this@MainActivity)
            }
        }
    }
}
