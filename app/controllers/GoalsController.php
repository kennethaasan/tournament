<?php

class GoalsController extends ApiController {

	/**
	 * Display a listing of the resource.
	 * GET /goals
	 *
	 * @return Response
	 */
	public function index()
	{
		$goals = Goal::all();

		if (count($goals) === 0)
		{
			return $this->respondNotFound('No goals exist.');
		}

		return $this->respond([
			'data' => $this->transformCollection($goals)
		]);
	}

	/**
	 * Store a newly created resource in storage.
	 * POST /goals
	 *
	 * @return Response
	 */
	public function store()
	{
		$data = Input::all();

		$validator = Validator::make($data, Goal::$rules);

		if ($validator->fails())
		{
			return $this->respondBadRequest('Validation fails.', $validator->messages()->toArray());
		}

		$goal = Goal::create($data);

		return $this->respondCreated('Goal successfully created.');
	}

	/**
	 * Display the specified resource.
	 * GET /goals/{id}
	 *
	 * @param  int  $id
	 * @return Response
	 */
	public function show($id)
	{
		$goal = Goal::find($id);

		if ( ! $goal)
		{
			return $this->respondNotFound('Goal does not exist.');
		}

		return $this->respond([
	        'data' => $this->transform($goal)
	    ]);
	}

	/**
	 * Update the specified resource in storage.
	 * PUT /goals/{id}
	 *
	 * @param  int  $id
	 * @return Response
	 */
	public function update($id)
	{
		$data = Input::all();

		$validator = Validator::make($data, Goal::$rules);

		if ($validator->fails())
		{
			return $this->respondBadRequest('Validation fails.', $validator->messages()->toArray());
		}

		$goal = Goal::find($id);

		$goal->update($data);

		return $this->respondCreated('Goal successfully updated.');
	}

	/**
	 * Remove the specified resource from storage.
	 * DELETE /goals/{id}
	 *
	 * @param  int  $id
	 * @return Response
	 */
	public function destroy($id)
	{
		Goal::destroy($id);

		return $this->respondCreated('Goal successfully deleted.');
	}

	private function transform($goal)
	{
		return [
			'id' 			=> (int) $goal['id'],
			'match_id' 		=> (int) $goal['match_id'],
			'player_id'		=> (int) $goal['player_id'],
			'player'		=> Player::find($goal['player_id'])->name
		];
	}

	private function transformCollection($goals)
	{
		return array_map([$this, 'transform'], $goals->toArray());
	}

}