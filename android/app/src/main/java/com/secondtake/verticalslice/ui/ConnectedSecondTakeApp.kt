package com.secondtake.verticalslice.ui

import android.app.Activity
import android.provider.Settings
import androidx.activity.compose.BackHandler
import androidx.compose.animation.core.LinearEasing
import androidx.compose.animation.core.RepeatMode
import androidx.compose.animation.core.animateFloat
import androidx.compose.animation.core.infiniteRepeatable
import androidx.compose.animation.core.rememberInfiniteTransition
import androidx.compose.animation.core.tween
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.BoxWithConstraints
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.imePadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.lazy.rememberLazyListState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.foundation.rememberScrollState
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.DropdownMenu
import androidx.compose.material3.DropdownMenuItem
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.snapshotFlow
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.alpha
import androidx.compose.ui.draw.clip
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.graphics.drawscope.rotate
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalFocusManager
import androidx.compose.ui.platform.LocalSoftwareKeyboardController
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.role
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import kotlinx.coroutines.flow.collectLatest
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.secondtake.verticalslice.R
import com.secondtake.verticalslice.billing.AccessState
import com.secondtake.verticalslice.billing.EntitlementMessage
import com.secondtake.verticalslice.billing.EntitlementUiState
import com.secondtake.verticalslice.billing.EntitlementViewModel
import com.secondtake.verticalslice.data.ScenarioRepository
import com.secondtake.verticalslice.domain.BranchPresentation
import com.secondtake.verticalslice.domain.LocaleTag
import com.secondtake.verticalslice.domain.MessageRole
import com.secondtake.verticalslice.domain.VisibleMessage
import com.secondtake.verticalslice.localization.ProvideInterfaceLanguage
import com.secondtake.verticalslice.localization.textResource
import com.secondtake.verticalslice.ui.theme.Action
import com.secondtake.verticalslice.ui.theme.Canvas as CanvasColor
import com.secondtake.verticalslice.ui.theme.Checkpoint
import com.secondtake.verticalslice.ui.theme.Coral
import com.secondtake.verticalslice.ui.theme.Ink
import com.secondtake.verticalslice.ui.theme.Line
import com.secondtake.verticalslice.ui.theme.Mint
import com.secondtake.verticalslice.ui.theme.Muted
import com.secondtake.verticalslice.ui.theme.MutedDark
import com.secondtake.verticalslice.ui.theme.Surface as SurfaceColor
import com.secondtake.verticalslice.ui.theme.SurfaceRaised
import com.secondtake.verticalslice.ui.theme.Violet
import com.secondtake.verticalslice.ui.theme.VioletDeep

@Composable
fun ConnectedSecondTakeApp(viewModel:ConnectedConversationViewModel, entitlementViewModel:EntitlementViewModel, purchaseActivity:Activity){
    val state by viewModel.uiState.collectAsStateWithLifecycle()
    val entitlementState by entitlementViewModel.uiState.collectAsStateWithLifecycle()
    LaunchedEffect(entitlementState.openFullComparison){
        if(entitlementState.openFullComparison){viewModel.showComparison();entitlementViewModel.consumeOpenFullComparison()}
    }
    ProvideInterfaceLanguage(state.localeContract.interfaceLanguage){
        var exit by rememberSaveable{mutableStateOf(false)}
        BackHandler(enabled=entitlementState.paywallVisible||state.status !is ConversationUiStatus.Intro){when{entitlementState.paywallVisible->entitlementViewModel.dismissPaywall();state.showComparison->viewModel.hideComparison();else->exit=true}}
        if(exit)AlertDialog(onDismissRequest={exit=false},title={Text(textResource(R.string.leave_practice_title))},text={Text(textResource(R.string.leave_practice_body))},confirmButton={TextButton(onClick={exit=false},modifier=Modifier.testTag("keep_practising")){Text(textResource(R.string.keep_practising))}},dismissButton={TextButton(onClick={exit=false;viewModel.restart()},modifier=Modifier.testTag("leave_practice")){Text(textResource(R.string.leave_practice))}})
        when{
            entitlementState.paywallVisible->RevenueCatPaywallScreen(entitlementState,entitlementViewModel,state.localeContract.interfaceLanguage,purchaseActivity)
            state.status is ConversationUiStatus.Rewinding->ConnectedRewindScreen()
            state.showComparison&&state.comparison!=null->ConnectedComparisonScreen(state,viewModel::hideComparison)
            else->Column(Modifier.fillMaxSize().background(CanvasColor).statusBarsPadding()){
                ConnectedBrandBar(state.localeContract.interfaceLanguage,state.status is ConversationUiStatus.Intro,viewModel::setLocale)
                when(state.status){
                    ConversationUiStatus.Intro->ConnectedIntro(state,viewModel::startSession)
                    ConversationUiStatus.Initializing->CenteredStatus(textResource(R.string.connecting_practice),"initializing")
                    else->ConnectedConversation(state,viewModel,entitlementViewModel::requestFullComparison)
                }
            }
        }
    }
}

@Composable private fun ConnectedBrandBar(locale:LocaleTag,enabled:Boolean,onLocale:(LocaleTag)->Unit){
    var expanded by remember{mutableStateOf(false)}
    Row(Modifier.fillMaxWidth().heightIn(min=68.dp).padding(horizontal=18.dp,vertical=8.dp),verticalAlignment=Alignment.CenterVertically,horizontalArrangement=Arrangement.SpaceBetween){
        Row(verticalAlignment=Alignment.CenterVertically){Canvas(Modifier.size(28.dp)){drawArc(Violet,190f,250f,false,Offset(2.dp.toPx(),3.dp.toPx()),androidx.compose.ui.geometry.Size(17.dp.toPx(),10.dp.toPx()),style=Stroke(2.dp.toPx(),cap=StrokeCap.Round));drawArc(Mint,10f,250f,false,Offset(9.dp.toPx(),13.dp.toPx()),androidx.compose.ui.geometry.Size(17.dp.toPx(),10.dp.toPx()),style=Stroke(2.dp.toPx(),cap=StrokeCap.Round))};Spacer(Modifier.width(8.dp));Text(textResource(R.string.app_name),color=Ink,fontWeight=FontWeight.Bold,fontSize=16.sp)}
        Box{Surface(Modifier.heightIn(min=48.dp).testTag("language_selector").clickable(enabled=enabled,role=Role.Button){expanded=true}.semantics{contentDescription=if(enabled)"Language" else "Language locked for this session"},shape=RoundedCornerShape(15.dp),color=SurfaceRaised,border=androidx.compose.foundation.BorderStroke(1.dp,Line)){Row(Modifier.padding(horizontal=12.dp),verticalAlignment=Alignment.CenterVertically){Text("◎",color=Mint,fontSize=19.sp);Spacer(Modifier.width(7.dp));Text(if(locale==ScenarioRepository.PortugueseBrazil)"PT-BR" else "EN",color=Ink,fontWeight=FontWeight.Bold,fontSize=12.sp);if(enabled){Spacer(Modifier.width(5.dp));Text("⌄",color=Muted)}}};DropdownMenu(expanded=expanded,onDismissRequest={expanded=false},modifier=Modifier.background(SurfaceRaised)){DropdownMenuItem(text={Text(textResource(R.string.language_pt))},onClick={expanded=false;onLocale(ScenarioRepository.PortugueseBrazil)});DropdownMenuItem(text={Text(textResource(R.string.language_en))},onClick={expanded=false;onLocale(ScenarioRepository.English)})}}
    }
}

@Composable private fun ConnectedIntro(state:ConnectedUiState,onStart:()->Unit){
    val script=ScenarioRepository.validatedScenario().scriptFor(state.localeContract.conversationLanguage)
    Column(Modifier.fillMaxSize().testTag("scenario_screen").verticalScroll(rememberScrollState()).padding(horizontal=20.dp,vertical=18.dp).padding(bottom=34.dp)){
        ConnectedEyebrow(textResource(R.string.conversation_fork),Violet);Spacer(Modifier.height(16.dp));Text(textResource(R.string.hero_title),color=Ink,fontWeight=FontWeight.Black,fontSize=43.sp,lineHeight=42.sp);Spacer(Modifier.height(16.dp));Text(textResource(R.string.hero_lede),color=Muted,fontSize=17.sp,lineHeight=25.sp);Spacer(Modifier.height(28.dp));Surface(shape=RoundedCornerShape(24.dp),color=SurfaceRaised,border=androidx.compose.foundation.BorderStroke(1.dp,Line)){Column(Modifier.padding(18.dp)){Text(script.title,color=Ink,fontWeight=FontWeight.Bold,fontSize=20.sp,lineHeight=25.sp);Spacer(Modifier.height(9.dp));Text(script.summary,color=Muted,fontSize=15.sp,lineHeight=22.sp)}};Spacer(Modifier.height(18.dp));ConnectedPrimaryButton(textResource(R.string.start_conversation),"start_conversation",onStart);Spacer(Modifier.height(10.dp));Text(textResource(R.string.input_helper),color=MutedDark,fontSize=12.sp,textAlign=TextAlign.Center,modifier=Modifier.fillMaxWidth())
    }
}

@Composable private fun ConnectedConversation(state:ConnectedUiState,viewModel:ConnectedConversationViewModel,onCompare:()->Unit){
    val listState=rememberLazyListState();val messages=state.displayMessages;val focusManager=LocalFocusManager.current;val keyboard=LocalSoftwareKeyboardController.current
    var followLatest by rememberSaveable{mutableStateOf(true)}
    LaunchedEffect(listState){
        snapshotFlow{listState.firstVisibleItemIndex to listState.firstVisibleItemScrollOffset}.collectLatest{
            val layout=listState.layoutInfo
            val lastVisible=layout.visibleItemsInfo.lastOrNull()?.index?:-1
            followLatest=lastVisible>=layout.totalItemsCount-2
        }
    }
    LaunchedEffect(messages.size,state.status,state.intervention){
        if(followLatest){
            snapshotFlow{listState.layoutInfo.totalItemsCount}.collectLatest{count->
                if(count>0){listState.animateScrollToItem(count-1);return@collectLatest}
            }
        }
    }
    Column(Modifier.fillMaxSize().testTag("conversation_screen").imePadding()){
        LazyColumn(state=listState,modifier=Modifier.weight(1f).fillMaxWidth().testTag("conversation_timeline"),contentPadding=PaddingValues(horizontal=16.dp,vertical=12.dp),verticalArrangement=Arrangement.spacedBy(12.dp)){
            item(key="conversation-heading"){Column(Modifier.padding(horizontal=4.dp,vertical=2.dp)){ConnectedEyebrow(textResource(R.string.conversation_fork),Violet);Text(textResource(R.string.check_in),color=Ink,fontWeight=FontWeight.Black,fontSize=28.sp,lineHeight=34.sp)}}
            if(state.restoredCheckpoint)item(key="checkpoint"){CheckpointCard()}
            items(messages,key={it.id}){ConnectedMessageBubble(it)}
            state.intervention?.let{copy->item(key="intervention-$copy"){SystemIntervention(copy,state.status,viewModel::retry,viewModel::dismissIntervention,viewModel::restart)}}
            when(val status=state.status){
                ConversationUiStatus.SendingTurn,ConversationUiStatus.WaitingForAlex->item(key="typing"){TypingIndicator()}
                is ConversationUiStatus.WaitingForIntentLock->item(key="intent-lock"){IntentLockCard(status,viewModel::confirmIntent)}
                else->Unit
            }
            if(state.rewindTargetTurnId!=null&&state.status is ConversationUiStatus.Ready)item(key="turning-point"){TurningPointCard(viewModel::rewind)}
            if(state.comparison?.branchB?.branchId!=state.comparison?.branchA?.branchId&&state.comparison!=null&&state.status is ConversationUiStatus.Ready)item(key="compare"){ConnectedPrimaryButton(textResource(R.string.full_comparison_cta),"compare_button",onCompare)}
        }
        val canInput=state.status is ConversationUiStatus.Ready
        BoxWithConstraints(Modifier.fillMaxWidth().background(SurfaceRaised).border(1.dp,Line).padding(12.dp)){
            val submit={keyboard?.hide();focusManager.clearFocus();viewModel.sendTurn()}
            if(maxWidth<360.dp){
                Column(verticalArrangement=Arrangement.spacedBy(8.dp)){
                    OutlinedTextField(value=state.inputText,onValueChange=viewModel::updateInput,enabled=canInput,modifier=Modifier.fillMaxWidth().testTag("free_text_input"),placeholder={Text(textResource(R.string.message_alex))},minLines=1,maxLines=3,shape=RoundedCornerShape(16.dp))
                    Button(onClick=submit,enabled=canInput&&state.inputText.isNotBlank(),modifier=Modifier.fillMaxWidth().heightIn(min=52.dp).testTag("send_turn"),shape=RoundedCornerShape(16.dp),colors=ButtonDefaults.buttonColors(containerColor=Violet,contentColor=CanvasColor)){Text(textResource(R.string.send),fontWeight=FontWeight.Bold)}
                }
            }else Row(Modifier.fillMaxWidth(),verticalAlignment=Alignment.Bottom,horizontalArrangement=Arrangement.spacedBy(8.dp)){
                OutlinedTextField(value=state.inputText,onValueChange=viewModel::updateInput,enabled=canInput,modifier=Modifier.weight(1f).testTag("free_text_input"),placeholder={Text(textResource(R.string.message_alex))},minLines=1,maxLines=4,shape=RoundedCornerShape(16.dp))
                Button(onClick=submit,enabled=canInput&&state.inputText.isNotBlank(),modifier=Modifier.heightIn(min=52.dp).testTag("send_turn"),shape=RoundedCornerShape(16.dp),colors=ButtonDefaults.buttonColors(containerColor=Violet,contentColor=CanvasColor)){Text(textResource(R.string.send),fontWeight=FontWeight.Bold)}
            }
        }
    }
}

@Composable private fun ConnectedMessageBubble(message:VisibleMessage){val user=message.role==MessageRole.USER;Row(Modifier.fillMaxWidth().testTag("turn_${message.turnId}").alpha(if(message.pending).65f else 1f),horizontalArrangement=if(user)Arrangement.End else Arrangement.Start,verticalAlignment=Alignment.Top){if(!user){ConnectedAvatar(false);Spacer(Modifier.width(9.dp))};Surface(Modifier.weight(1f),color=if(user)VioletDeep else SurfaceColor,border=androidx.compose.foundation.BorderStroke(1.dp,if(user)Violet.copy(alpha=.6f) else Line),shape=if(user)RoundedCornerShape(19.dp,7.dp,19.dp,19.dp) else RoundedCornerShape(7.dp,19.dp,19.dp,19.dp)){Column(Modifier.padding(13.dp)){Text(if(user)textResource(R.string.user_role).uppercase() else textResource(R.string.alex_role).uppercase(),color=if(user)Violet else Mint,fontWeight=FontWeight.Bold,fontSize=10.sp);Spacer(Modifier.height(5.dp));Text(message.text,color=Ink,fontSize=15.sp,lineHeight=21.sp,textAlign=if(user)TextAlign.End else TextAlign.Start);if(message.pending)Text(textResource(R.string.sending),color=MutedDark,fontSize=10.sp,modifier=Modifier.padding(top=4.dp))}};if(user){Spacer(Modifier.width(9.dp));ConnectedAvatar(true)}}}
@Composable private fun ConnectedAvatar(user:Boolean){Box(Modifier.size(36.dp).clip(if(user)RoundedCornerShape(9.dp) else CircleShape).background(if(user)Violet else Mint).semantics{contentDescription=if(user)"You" else "Alex"},contentAlignment=Alignment.Center){Text(if(user)textResource(R.string.user_avatar) else "A",color=CanvasColor,fontWeight=FontWeight.Black,fontSize=10.sp)}}

@Composable private fun IntentLockCard(status:ConversationUiStatus.WaitingForIntentLock,onConfirm:(String,String)->Unit){Surface(Modifier.fillMaxWidth().testTag("intent_lock"),color=Checkpoint.copy(alpha=.08f),border=androidx.compose.foundation.BorderStroke(1.dp,Checkpoint.copy(alpha=.7f)),shape=RoundedCornerShape(20.dp)){Column(Modifier.padding(16.dp)){ConnectedEyebrow(textResource(R.string.your_intention),Checkpoint);Spacer(Modifier.height(8.dp));Text(textResource(R.string.intent_lock_question),color=Ink,fontWeight=FontWeight.Bold,fontSize=17.sp);Spacer(Modifier.height(12.dp));status.options.take(2).forEach{option->Surface(Modifier.fillMaxWidth().heightIn(min=52.dp).padding(vertical=4.dp).testTag("intent_${option.intent}").clickable(role=Role.Button){onConfirm(status.turnId,option.intent)}.semantics{role=Role.Button},color=SurfaceRaised,border=androidx.compose.foundation.BorderStroke(1.dp,Checkpoint.copy(alpha=.55f)),shape=RoundedCornerShape(15.dp)){Row(Modifier.padding(13.dp),verticalAlignment=Alignment.CenterVertically){Text(option.label,color=Ink,modifier=Modifier.weight(1f));Text("→",color=Checkpoint)}}}}}}
@Composable private fun TypingIndicator(){Surface(Modifier.testTag("alex_typing"),color=SurfaceColor,border=androidx.compose.foundation.BorderStroke(1.dp,Line),shape=RoundedCornerShape(7.dp,19.dp,19.dp,19.dp)){Text(textResource(R.string.alex_responding),color=Muted,modifier=Modifier.padding(horizontal=16.dp,vertical=12.dp))}}
@Composable private fun SystemIntervention(copy:String,status:ConversationUiStatus,onRetry:()->Unit,onDismiss:()->Unit,onRestart:()->Unit){val recover=status as? ConversationUiStatus.RecoverableNetworkError;Surface(Modifier.fillMaxWidth().testTag("recovery_card"),color=Color(0xFF1C2630),border=androidx.compose.foundation.BorderStroke(1.dp,Checkpoint.copy(alpha=.55f)),shape=RoundedCornerShape(18.dp)){Column(Modifier.padding(15.dp)){ConnectedEyebrow("SECOND TAKE",Checkpoint);Spacer(Modifier.height(7.dp));Text(copy,color=Ink,lineHeight=21.sp);Spacer(Modifier.height(10.dp));Row(horizontalArrangement=Arrangement.spacedBy(8.dp)){if(recover?.canRetry==true)TextButton(onClick=onRetry,modifier=Modifier.heightIn(min=48.dp).testTag("retry_network")){Text(textResource(R.string.try_again))};if(recover?.kind==ErrorKind.SESSION_LOST)TextButton(onClick=onRestart,modifier=Modifier.heightIn(min=48.dp)){Text(textResource(R.string.start_again))}else TextButton(onClick=onDismiss,modifier=Modifier.heightIn(min=48.dp)){Text(textResource(R.string.dismiss))}}}}}
@Composable private fun TurningPointCard(onRewind:()->Unit){Surface(Modifier.fillMaxWidth().testTag("turning_point"),color=Color(0xFF321F29),border=androidx.compose.foundation.BorderStroke(1.dp,Coral.copy(alpha=.55f)),shape=RoundedCornerShape(23.dp)){Column(Modifier.padding(18.dp)){ConnectedEyebrow(textResource(R.string.turning_point),Coral);Spacer(Modifier.height(7.dp));Text(textResource(R.string.changed_direction),color=Ink,fontWeight=FontWeight.Bold,fontSize=19.sp);Spacer(Modifier.height(13.dp));ConnectedPrimaryButton("↶  ${textResource(R.string.rewind_action)}","rewind_button",onRewind,Coral)}}}
@Composable private fun CheckpointCard(){Surface(Modifier.fillMaxWidth().testTag("checkpoint"),color=Checkpoint.copy(alpha=.08f),border=androidx.compose.foundation.BorderStroke(1.dp,Checkpoint.copy(alpha=.7f)),shape=RoundedCornerShape(20.dp)){Column(Modifier.padding(16.dp)){ConnectedEyebrow(textResource(R.string.back_here_now),Checkpoint);Spacer(Modifier.height(8.dp));Text(textResource(R.string.context_preserved),color=Muted);Spacer(Modifier.height(8.dp));Text(textResource(R.string.only_response_changes),color=Ink,fontWeight=FontWeight.Bold)}}}

@Composable private fun ConnectedRewindScreen(){val context=LocalContext.current;val reduced=remember{Settings.Global.getFloat(context.contentResolver,Settings.Global.ANIMATOR_DURATION_SCALE,1f)==0f};val transition=rememberInfiniteTransition(label="rewind");val angle by transition.animateFloat(0f,-360f,infiniteRepeatable(tween(1250,easing=LinearEasing),RepeatMode.Restart),label="rewind-angle");Column(Modifier.fillMaxSize().testTag("rewind_screen").background(CanvasColor).statusBarsPadding(),verticalArrangement=Arrangement.Center,horizontalAlignment=Alignment.CenterHorizontally){ConnectedEyebrow(textResource(R.string.rewinding),Violet);Spacer(Modifier.height(22.dp));Canvas(Modifier.size(118.dp).semantics{contentDescription="Rewinding conversation"}){drawCircle(Line,size.minDimension*.34f,style=Stroke(3.dp.toPx()));drawArc(Checkpoint,205f,150f,false,style=Stroke(3.dp.toPx(),cap=StrokeCap.Round));rotate(if(reduced)-45f else angle){drawCircle(Checkpoint,8.dp.toPx(),Offset(center.x,center.y-size.minDimension*.34f))}};Spacer(Modifier.height(24.dp));Text(textResource(R.string.restoring_checkpoint),color=Ink,fontWeight=FontWeight.Bold,fontSize=18.sp)}}

@Composable private fun ConnectedComparisonScreen(state:ConnectedUiState,onBack:()->Unit){val comparison=state.comparison?:return;BoxWithConstraints(Modifier.fillMaxSize().background(CanvasColor).statusBarsPadding()){val inset=if(maxWidth<360.dp)14.dp else 20.dp;Column(Modifier.fillMaxSize().verticalScroll(rememberScrollState()).padding(horizontal=inset,vertical=16.dp).testTag("comparison_screen")){ConnectedEyebrow(textResource(R.string.fork_complete),Violet);Spacer(Modifier.height(12.dp));Text(textResource(R.string.two_trajectories),color=Ink,fontWeight=FontWeight.Black,fontSize=30.sp,lineHeight=36.sp);Spacer(Modifier.height(8.dp));Text(textResource(R.string.comparison_observable),color=Muted);Spacer(Modifier.height(20.dp));ConnectedVersionCard(textResource(R.string.version_a),comparison.branchA,Coral);Spacer(Modifier.height(12.dp));ConnectedVersionCard(textResource(R.string.version_b),comparison.branchB,Mint);Spacer(Modifier.height(16.dp));ConnectedPrimaryButton(textResource(R.string.back_to_conversation),"comparison_back",onBack);Spacer(Modifier.height(12.dp))}}}

@Composable private fun RevenueCatPaywallScreen(state:EntitlementUiState,viewModel:EntitlementViewModel,locale:LocaleTag,activity:Activity){
    val pt=locale==ScenarioRepository.PortugueseBrazil
    Column(Modifier.fillMaxSize().background(CanvasColor).statusBarsPadding().verticalScroll(rememberScrollState()).padding(horizontal=20.dp,vertical=16.dp).testTag("revenuecat_paywall")){
        Row(Modifier.fillMaxWidth(),horizontalArrangement=Arrangement.SpaceBetween,verticalAlignment=Alignment.CenterVertically){ConnectedEyebrow("SECOND TAKE PRO",Violet);TextButton(onClick=viewModel::dismissPaywall,enabled=!state.purchaseInProgress,modifier=Modifier.heightIn(min=48.dp).testTag("paywall_close")){Text(textResource(R.string.paywall_not_now))}}
        Spacer(Modifier.height(18.dp));Text(textResource(R.string.paywall_title),color=Ink,fontWeight=FontWeight.Black,fontSize=34.sp,lineHeight=39.sp);Spacer(Modifier.height(10.dp));Text(textResource(R.string.paywall_body),color=Muted,fontSize=16.sp,lineHeight=23.sp)
        Spacer(Modifier.height(22.dp));Surface(Modifier.fillMaxWidth(),shape=RoundedCornerShape(22.dp),color=SurfaceRaised,border=androidx.compose.foundation.BorderStroke(1.dp,Violet.copy(alpha=.65f))){Column(Modifier.padding(18.dp)){Text("PRO",color=Violet,fontWeight=FontWeight.ExtraBold,fontSize=12.sp,letterSpacing=1.3.sp);Spacer(Modifier.height(12.dp));PaywallBenefit(textResource(R.string.paywall_benefit_comparison));Spacer(Modifier.height(9.dp));PaywallBenefit(textResource(R.string.paywall_benefit_consequences));Spacer(Modifier.height(18.dp));when{state.offeringLoading->{Text(textResource(R.string.paywall_loading),color=Muted,modifier=Modifier.testTag("offering_loading"));Spacer(Modifier.height(14.dp))};state.product!=null->{Text(state.product.title,color=Ink,fontWeight=FontWeight.Bold,fontSize=17.sp);Spacer(Modifier.height(5.dp));Text(state.product.formattedPrice+periodSuffix(state.product.periodIso8601,pt),color=Mint,fontWeight=FontWeight.Black,fontSize=22.sp,modifier=Modifier.testTag("revenuecat_price"));Spacer(Modifier.height(14.dp))};else->{Text(textResource(R.string.paywall_offering_unavailable),color=Coral,modifier=Modifier.testTag("offering_unavailable"));Spacer(Modifier.height(12.dp));TextButton(onClick=viewModel::loadOffering,modifier=Modifier.heightIn(min=48.dp).testTag("retry_offering")){Text(textResource(R.string.try_again))}}};if(state.product!=null)ConnectedPrimaryButton(if(state.purchaseInProgress)textResource(R.string.paywall_purchasing)else textResource(R.string.paywall_unlock),"purchase_pro",{viewModel.purchase(activity)},start=Violet)}}
        state.message?.let{message->Spacer(Modifier.height(12.dp));Surface(Modifier.fillMaxWidth(),color=Color(0xFF1C2630),shape=RoundedCornerShape(15.dp)){Row(Modifier.padding(13.dp),verticalAlignment=Alignment.CenterVertically){Text(entitlementMessage(message),color=Ink,modifier=Modifier.weight(1f));TextButton(onClick=viewModel::clearMessage,modifier=Modifier.heightIn(min=48.dp)){Text("OK")}}}}
        Spacer(Modifier.height(12.dp));TextButton(onClick=viewModel::restore,enabled=!state.purchaseInProgress&&!state.restoreInProgress,modifier=Modifier.fillMaxWidth().heightIn(min=48.dp).testTag("restore_purchases")){Text(if(state.restoreInProgress)textResource(R.string.paywall_restoring)else textResource(R.string.paywall_restore))};Spacer(Modifier.height(12.dp));Text(textResource(R.string.paywall_test_store_note),color=MutedDark,fontSize=11.sp,lineHeight=16.sp,textAlign=TextAlign.Center,modifier=Modifier.fillMaxWidth())
    }
}
@Composable private fun PaywallBenefit(copy:String){Row(verticalAlignment=Alignment.Top){Text("✓",color=Mint,fontWeight=FontWeight.Black);Spacer(Modifier.width(9.dp));Text(copy,color=Ink,modifier=Modifier.weight(1f),lineHeight=21.sp)}}
@Composable private fun entitlementMessage(message:EntitlementMessage)=when(message){EntitlementMessage.PURCHASE_FAILED->textResource(R.string.paywall_purchase_failed);EntitlementMessage.RESTORE_FAILED->textResource(R.string.paywall_restore_failed);EntitlementMessage.NOTHING_TO_RESTORE->textResource(R.string.paywall_nothing_to_restore);EntitlementMessage.OFFERING_UNAVAILABLE->textResource(R.string.paywall_offering_unavailable)}
private fun periodSuffix(period:String?,pt:Boolean)=when(period){"P1M"->if(pt)" / mês" else " / month";"P1Y"->if(pt)" / ano" else " / year";"P1W"->if(pt)" / semana" else " / week";else->""}
@Composable private fun ConnectedVersionCard(label:String,branch:BranchPresentation,accent:Color){Surface(Modifier.fillMaxWidth(),color=SurfaceColor,border=androidx.compose.foundation.BorderStroke(1.dp,accent.copy(alpha=.65f)),shape=RoundedCornerShape(20.dp)){Column(Modifier.padding(15.dp)){ConnectedEyebrow(label,accent);Spacer(Modifier.height(10.dp));Text("“${branch.userChoice}”",color=Ink,fontWeight=FontWeight.Bold,fontSize=16.sp,lineHeight=22.sp);Spacer(Modifier.height(10.dp));HorizontalDivider(color=Line);Spacer(Modifier.height(10.dp));Text(branch.alexReply,color=Muted,fontSize=14.sp,lineHeight=20.sp)}}}
@Composable private fun CenteredStatus(text:String,tag:String){Box(Modifier.fillMaxSize().testTag(tag),contentAlignment=Alignment.Center){Text(text,color=Muted)}}
@Composable private fun ConnectedEyebrow(text:String,color:Color){Row(verticalAlignment=Alignment.CenterVertically){Box(Modifier.width(18.dp).height(1.dp).background(color));Spacer(Modifier.width(8.dp));Text(text.uppercase(),color=color,fontWeight=FontWeight.ExtraBold,fontSize=11.sp,letterSpacing=1.3.sp)}}
@Composable private fun ConnectedPrimaryButton(label:String,tag:String,onClick:()->Unit,start:Color=Violet){Button(onClick=onClick,modifier=Modifier.fillMaxWidth().heightIn(min=56.dp).testTag(tag),shape=RoundedCornerShape(18.dp),colors=ButtonDefaults.buttonColors(containerColor=start,contentColor=CanvasColor)){Text(label,fontWeight=FontWeight.Bold,fontSize=15.sp)}}
